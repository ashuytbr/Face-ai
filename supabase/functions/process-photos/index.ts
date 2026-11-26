import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
const FACE_SERVICE_URL = Deno.env.get("FACE_SERVICE_URL") as string | undefined;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

interface ProcessRequest {
  photo_id: string;
}

interface FaceDetection {
  bbox: [number, number, number, number];
  confidence: number;
  embedding: number[];
}

interface FaceServiceProcessResponse {
  faces: FaceDetection[];
  width: number;
  height: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { photo_id } = (await req.json()) as ProcessRequest;
    if (!photo_id) {
      return new Response(JSON.stringify({ error: "Missing photo_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the photo record
    const { data: photo, error: photoErr } = await supabase
      .from("photos")
      .select("*")
      .eq("id", photo_id)
      .maybeSingle();

    if (photoErr || !photo) {
      return new Response(JSON.stringify({ error: "Photo not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark as processing
    await supabase.from("photos").update({ status: "processing" }).eq("id", photo_id);
    await supabase.from("processing_jobs").update({ status: "processing", started_at: new Date().toISOString() }).eq("photo_id", photo_id).eq("status", "queued");

    // Download the photo from storage
    const { data: photoFile, error: downloadErr } = await supabase.storage
      .from("event-photos")
      .download(photo.storage_key);

    if (downloadErr || !photoFile) {
      await supabase.from("photos").update({ status: "failed", error_message: "Could not download photo" }).eq("id", photo_id);
      await supabase.from("processing_jobs").update({ status: "failed", error_message: "Download failed", completed_at: new Date().toISOString() }).eq("photo_id", photo_id);
      return new Response(JSON.stringify({ error: "Could not download photo" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!FACE_SERVICE_URL) {
      // No face service configured — fail loudly instead of pretending success
      await supabase.from("photos").update({ status: "failed", error_message: "Face recognition service not configured" }).eq("id", photo_id);
      await supabase.from("processing_jobs").update({ status: "failed", error_message: "FACE_SERVICE_URL not set", completed_at: new Date().toISOString() }).eq("photo_id", photo_id);
      return new Response(JSON.stringify({ error: "Face recognition service not configured. Deploy the face service and set FACE_SERVICE_URL." }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call the face recognition service to detect faces and generate embeddings
    const formData = new FormData();
    formData.append("image", photoFile);

    const faceResponse = await fetch(`${FACE_SERVICE_URL}/detect`, {
      method: "POST",
      body: formData,
    });

    if (!faceResponse.ok) {
      const errText = await faceResponse.text();
      throw new Error(`Face service error: ${faceResponse.status} ${errText}`);
    }

    const faceData = (await faceResponse.json()) as FaceServiceProcessResponse;

    // Update photo dimensions
    await supabase.from("photos").update({ width: faceData.width, height: faceData.height }).eq("id", photo_id);

    if (faceData.faces.length === 0) {
      // No faces found
      await supabase.from("photos").update({ status: "no_faces", face_count: 0 }).eq("id", photo_id);
      await supabase.from("processing_jobs").update({ status: "completed", completed_at: new Date().toISOString() }).eq("photo_id", photo_id);
      return new Response(JSON.stringify({ message: "No faces detected", face_count: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Store each face and its embedding
    for (const face of faceData.faces) {
      const { data: faceRow, error: faceErr } = await supabase
        .from("faces")
        .insert({
          photo_id: photo_id,
          event_id: photo.event_id,
          bbox_x: face.bbox[0],
          bbox_y: face.bbox[1],
          bbox_w: face.bbox[2],
          bbox_h: face.bbox[3],
          confidence: face.confidence,
        })
        .select()
        .single();

      if (faceErr || !faceRow) continue;

      const embeddingString = `[${face.embedding.join(",")}]`;
      await supabase.from("face_embeddings").insert({
        face_id: faceRow.id,
        event_id: photo.event_id,
        photo_id: photo_id,
        embedding: embeddingString,
      });
    }

    // Mark photo as processed
    await supabase.from("photos").update({ status: "processed", face_count: faceData.faces.length }).eq("id", photo_id);
    await supabase.from("processing_jobs").update({ status: "completed", completed_at: new Date().toISOString() }).eq("photo_id", photo_id);

    return new Response(JSON.stringify({ message: "Photo processed", face_count: faceData.faces.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
