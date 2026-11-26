import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;

// The face recognition service URL (Python FastAPI + InsightFace).
// Required in production: deploy the face service and set this env var.
const FACE_SERVICE_URL = Deno.env.get("FACE_SERVICE_URL") as string | undefined;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

interface FaceMatchRequest {
  event_id: string;
  session_id: string;
  selfie_key: string;
}

interface FaceServiceResponse {
  embedding: number[];
  faces_detected: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { event_id, session_id, selfie_key } = (await req.json()) as FaceMatchRequest;

    if (!event_id || !session_id || !selfie_key) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the event exists, is not suspended, and has selfie matching enabled
    const { data: event, error: eventErr } = await supabase
      .from("events")
      .select("id, is_suspended, selfi_match_enabled, similarity_threshold, expires_at")
      .eq("id", event_id)
      .maybeSingle();

    if (eventErr || !event) {
      return new Response(JSON.stringify({ error: "Event not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (event.is_suspended || !event.selfi_match_enabled) {
      return new Response(JSON.stringify({ error: "Selfie matching is not available for this event" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (event.expires_at && new Date(event.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Event has expired" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download the selfie from storage
    const selfieBucket = "guest-selfies";
    const { data: selfieFile, error: downloadErr } = await supabase.storage
      .from(selfieBucket)
      .download(selfie_key);

    if (downloadErr || !selfieFile) {
      return new Response(JSON.stringify({ error: "Could not retrieve selfie" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate face embedding for the selfie
    let queryEmbedding: number[];

    if (FACE_SERVICE_URL) {
      // Call the external Python face recognition service
      const formData = new FormData();
      formData.append("image", selfieFile);

      const faceResponse = await fetch(`${FACE_SERVICE_URL}/embed`, {
        method: "POST",
        body: formData,
      });

      if (!faceResponse.ok) {
        const errText = await faceResponse.text();
        throw new Error(`Face service error: ${faceResponse.status} ${errText}`);
      }

      const faceData = (await faceResponse.json()) as FaceServiceResponse;

      if (faceData.faces_detected === 0) {
        await supabase
          .from("guest_search_sessions")
          .update({ status: "no_match", match_count: 0, completed_at: new Date().toISOString() })
          .eq("id", session_id);

        return new Response(JSON.stringify({ matches: [], message: "No face detected in selfie" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      queryEmbedding = faceData.embedding;
    } else {
      // No face service configured — fail loudly instead of returning fake empty results
      await supabase
        .from("guest_search_sessions")
        .update({
          status: "failed",
          match_count: 0,
          completed_at: new Date().toISOString(),
          error_message: "Face recognition service not configured.",
        })
        .eq("id", session_id);

      return new Response(
        JSON.stringify({
          error: "Face recognition service not configured. Deploy the Python/InsightFace service and set FACE_SERVICE_URL.",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Search for matching faces within this event only
    const embeddingString = `[${queryEmbedding.join(",")}]`;
    const { data: matches, error: searchErr } = await supabase.rpc("search_faces_in_event", {
      p_event_id: event_id,
      p_query_embedding: embeddingString,
      p_threshold: event.similarity_threshold,
      p_max_results: 100,
    });

    if (searchErr) throw searchErr;

    const matchResults = matches || [];

    // Update session with results
    await supabase
      .from("guest_search_sessions")
      .update({
        status: matchResults.length > 0 ? "completed" : "no_match",
        match_count: matchResults.length,
        completed_at: new Date().toISOString(),
      })
      .eq("id", session_id);

    return new Response(JSON.stringify({ matches: matchResults }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
