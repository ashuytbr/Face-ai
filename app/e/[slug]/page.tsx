'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { supabase, Event, MatchResult, SELFIE_BUCKET, STORAGE_BUCKET } from '@/lib/supabase';
import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { EVENT_TYPE_LABELS, formatDate, downloadFile } from '@/lib/helpers';
import { SignedImage } from '@/components/dashboard/signed-image';
import {
  Scan,
  Camera,
  Upload,
  Loader2,
  Shield,
  Check,
  X,
  Download,
  Image as ImageIcon,
  AlertCircle,
  Clock,
  PartyPopper,
  ArrowRight,
  Lock,
} from 'lucide-react';
import Link from 'next/link';

type Stage = 'loading' | 'not_found' | 'expired' | 'consent' | 'upload' | 'searching' | 'results' | 'no_match' | 'error';

export default function GuestEventPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [event, setEvent] = useState<Event | null>(null);
  const [stage, setStage] = useState<Stage>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);

  useEffect(() => {
    async function loadEvent() {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (error || !data) {
        setStage('not_found');
        return;
      }

      const evt = data as Event;
      setEvent(evt);

      if (evt.is_suspended) {
        setStage('not_found');
        return;
      }
      if (evt.expires_at && new Date(evt.expires_at) < new Date()) {
        setStage('expired');
        return;
      }

      setStage(evt.selfi_match_enabled ? 'consent' : 'upload');
    }
    loadEvent();
  }, [slug]);

  const handleSelfieUpload = async (file: File) => {
    if (!event) return;
    setSelfiePreview(URL.createObjectURL(file));
    setStage('searching');

    try {
      // Create guest search session
      const { data: session, error: sessionErr } = await supabase
        .from('guest_search_sessions')
        .insert({
          event_id: event.id,
          consent_given: true,
          status: 'searching',
        })
        .select()
        .single();

      if (sessionErr) throw sessionErr;
      setSessionId(session.id);

      // Upload selfie to private bucket (temporarily)
      const selfieKey = `selfies/${event.id}/${session.id}-${Date.now()}.jpg`;
      const { error: uploadErr } = await supabase.storage.from(SELFIE_BUCKET).upload(selfieKey, file, { contentType: file.type });
      if (uploadErr) throw uploadErr;

      await supabase
        .from('guest_search_sessions')
        .update({ selfie_storage_key: selfieKey })
        .eq('id', session.id);

      // Call the face-match edge function
      const { data: fnData, error: fnErr } = await supabase.functions.invoke('face-match', {
        body: { event_id: event.id, session_id: session.id, selfie_key: selfieKey },
      });

      if (fnErr) throw fnErr;

      const resultMatches = (fnData?.matches ?? []) as MatchResult[];

      // Clean up: delete selfie after matching
      await supabase.storage.from(SELFIE_BUCKET).remove([selfieKey]);
      await supabase
        .from('guest_search_sessions')
        .update({
          status: resultMatches.length > 0 ? 'completed' : 'no_match',
          match_count: resultMatches.length,
          selfie_deleted: true,
          completed_at: new Date().toISOString(),
        })
        .eq('id', session.id);

      setMatches(resultMatches);
      setStage(resultMatches.length > 0 ? 'results' : 'no_match');

      // Increment event search counter
      try {
        await supabase.rpc('increment_event_searches', { p_event_id: event.id });
      } catch {
        await supabase.from('events').update({ total_searches: (event.total_searches ?? 0) + 1 }).eq('id', event.id);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Search failed. Please try again.');
      setStage('error');
    }
  };

  // ---- Render stages ----

  if (stage === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (stage === 'not_found') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
        <Logo />
        <div className="mt-12 max-w-md">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h1 className="text-xl font-bold">Event not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">This event may have been removed or the link is incorrect.</p>
        </div>
      </div>
    );
  }

  if (stage === 'expired') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
        <Logo />
        <div className="mt-12 max-w-md">
          <Clock className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h1 className="text-xl font-bold">Event expired</h1>
          <p className="mt-2 text-sm text-muted-foreground">This event is no longer available for guest photo search.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Logo size="sm" />
          <span className="text-xs text-muted-foreground">Powered by PODDAR PIX</span>
        </div>
      </header>

      {/* Cover */}
      {event?.cover_url && (
        <div className="relative h-48 w-full overflow-hidden sm:h-64">
          <img src={event.cover_url} alt={event.name} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        </div>
      )}

      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Event info */}
        <div className={`mb-8 ${event?.cover_url ? '-mt-8 relative z-10' : ''}`}>
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{event?.name}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {event && EVENT_TYPE_LABELS[event.event_type]} · {event && formatDate(event.event_date)}
                  {event?.venue && ` · ${event.venue}`}
                </p>
                {event?.photographer_name && (
                  <p className="mt-1 text-sm text-muted-foreground">Photographer: {event.photographer_name}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stage content */}
        {stage === 'consent' && (
          <ConsentStage event={event!} onAccept={() => setStage('upload')} />
        )}

        {stage === 'upload' && (
          <UploadStage onUpload={handleSelfieUpload} selfiePreview={selfiePreview} />
        )}

        {stage === 'searching' && <SearchingStage />}

        {stage === 'results' && (
          <ResultsStage
            event={event!}
            matches={matches}
            sessionId={sessionId}
            onSearchAgain={() => { setMatches([]); setSelfiePreview(null); setStage('upload'); }}
          />
        )}

        {stage === 'no_match' && (
          <NoMatchStage onSearchAgain={() => { setSelfiePreview(null); setStage('upload'); }} />
        )}

        {stage === 'error' && (
          <ErrorStage message={errorMessage} onRetry={() => { setSelfiePreview(null); setStage('upload'); }} />
        )}
      </div>
    </div>
  );
}

// ---- Consent ----
function ConsentStage({ event, onAccept }: { event: Event; onAccept: () => void }) {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">How photo matching works</h2>
            <p className="text-sm text-muted-foreground">Your privacy is protected.</p>
          </div>
        </div>

        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-3">
            <Camera className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
            <p>You upload or capture a selfie. The system detects your face and generates a face embedding.</p>
          </div>
          <div className="flex items-start gap-3">
            <Scan className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
            <p>Your face embedding is compared only against photos from <strong className="text-foreground">{event.name}</strong>. It is never searched against other events.</p>
          </div>
          <div className="flex items-start gap-3">
            <ImageIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
            <p>Matching photos are displayed for you to preview and download.</p>
          </div>
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
            <p>Your selfie is <strong className="text-foreground">deleted immediately</strong> after matching. We do not retain your selfie or store your face embedding.</p>
          </div>
          <div className="flex items-start gap-3">
            <X className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <p>No cross-event tracking. No biometric profile is created about you.</p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-background p-4">
          <p className="text-xs text-muted-foreground">
            By continuing, you consent to facial recognition processing solely for finding your photos in this event.
            You can use the search without creating an account.
          </p>
        </div>

        <Button onClick={onAccept} className="w-full" size="lg">
          I consent — Find my photos
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ---- Upload ----
function UploadStage({ onUpload, selfiePreview }: { onUpload: (file: File) => void; selfiePreview: string | null }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {selfiePreview && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <img src={selfiePreview} alt="Your selfie" className="mx-auto max-h-48 rounded-lg" />
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-6">
        <div>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Camera className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-lg font-semibold">Upload your selfie</h2>
          <p className="mt-1 text-sm text-muted-foreground">Take a clear photo of your face. We&apos;ll find your photos in seconds.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Button
            size="lg"
            variant="outline"
            onClick={() => cameraInputRef.current?.click()}
            className="h-20 flex-col gap-2"
          >
            <Camera className="h-6 w-6" />
            <span>Take Photo</span>
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="h-20 flex-col gap-2"
          >
            <Upload className="h-6 w-6" />
            <span>Choose File</span>
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); }}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="user"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); }}
        />

        <p className="text-xs text-muted-foreground">
          Your selfie is deleted immediately after matching. We don&apos;t retain it.
        </p>
      </div>
    </div>
  );
}

// ---- Searching ----
function SearchingStage() {
  return (
    <div className="mx-auto max-w-lg">
      <div className="rounded-2xl border border-border bg-card p-12 text-center">
        <div className="relative mx-auto mb-6 h-24 w-24">
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse-ring" />
          <div className="absolute inset-2 rounded-full bg-primary/20 animate-pulse-ring" style={{ animationDelay: '0.5s' }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary">
              <Scan className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
        </div>
        <h2 className="text-lg font-semibold">Finding your photos...</h2>
        <p className="mt-2 text-sm text-muted-foreground">Scanning event photos for your face. This takes a few seconds.</p>
        <div className="mt-6 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      </div>
    </div>
  );
}

// ---- Results ----
function ResultsStage({
  event,
  matches,
  sessionId,
  onSearchAgain,
}: {
  event: Event;
  matches: MatchResult[];
  sessionId: string | null;
  onSearchAgain: () => void;
}) {
  const [downloading, setDownloading] = useState(false);
  const [preview, setPreview] = useState<MatchResult | null>(null);

  const downloadOne = async (match: MatchResult) => {
    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(match.storage_key, 300);
    if (error || !data?.signedUrl) return;
    downloadFile(data.signedUrl, match.file_name);
    await supabase.from('download_records').insert({
      photo_id: match.photo_id,
      event_id: event.id,
      session_id: sessionId,
      is_guest: true,
      file_size: 0,
    });
  };

  const downloadAll = async () => {
    setDownloading(true);
    for (const m of matches) {
      await downloadOne(m);
    }
    setDownloading(false);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 text-center">
        <PartyPopper className="mx-auto mb-2 h-8 w-8 text-primary" />
        <h2 className="text-xl font-bold">We found {matches.length} photo{matches.length !== 1 ? 's' : ''} of you!</h2>
        <p className="mt-1 text-sm text-muted-foreground">Preview and download your photos below.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={onSearchAgain}>
          <Scan className="mr-2 h-4 w-4" /> Search Again
        </Button>
        {event.downloads_enabled && (
          <Button onClick={downloadAll} disabled={downloading}>
            {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Download All ({matches.length})
          </Button>
        )}
      </div>

      {/* Results grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {matches.map((match) => (
          <div key={match.photo_id} className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-secondary">
            <SignedImage storageKey={match.storage_key} alt={match.file_name} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-background/60 opacity-0 transition-opacity group-hover:opacity-100">
              <div className="flex h-full items-center justify-center gap-2">
                <Button size="sm" variant="secondary" onClick={() => setPreview(match)}>
                  <ImageIcon className="h-4 w-4" />
                </Button>
                {event.downloads_enabled && (
                  <Button size="sm" variant="secondary" onClick={() => downloadOne(match)}>
                    <Download className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="absolute bottom-1 right-1 rounded bg-background/80 px-1.5 py-0.5 text-[10px] font-medium">
              {(match.similarity * 100).toFixed(0)}% match
            </div>
          </div>
        ))}
      </div>

      {/* Preview dialog */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 p-4" onClick={() => setPreview(null)}>
          <div className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-xl border border-border bg-card" onClick={(e) => e.stopPropagation()}>
            <Button size="icon" variant="secondary" className="absolute right-2 top-2 z-10" onClick={() => setPreview(null)}>
              <X className="h-4 w-4" />
            </Button>
            <div className="flex max-h-[80vh] items-center justify-center bg-black/30 p-4">
              <SignedImage storageKey={preview.storage_key} alt={preview.file_name} className="max-h-[70vh] rounded-lg object-contain" />
            </div>
            {event.downloads_enabled && (
              <div className="border-t border-border p-3 text-center">
                <Button size="sm" onClick={() => downloadOne(preview)}>
                  <Download className="mr-2 h-4 w-4" /> Download
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card p-4 text-center text-sm text-muted-foreground">
        <Lock className="mx-auto mb-2 h-5 w-5 text-success" />
        Your selfie has been deleted. No biometric data about you has been retained.
      </div>
    </div>
  );
}

// ---- No Match ----
function NoMatchStage({ onSearchAgain }: { onSearchAgain: () => void }) {
  return (
    <div className="mx-auto max-w-lg">
      <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
          <ImageIcon className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold">No matching photos found</h2>
        <p className="text-sm text-muted-foreground">
          We couldn&apos;t find photos matching your selfie in this event. This could mean:
        </p>
        <ul className="mx-auto max-w-sm space-y-1.5 text-left text-sm text-muted-foreground">
          <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-muted-foreground" /> Photos are still being processed — try again later</li>
          <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-muted-foreground" /> Your face wasn&apos;t clearly visible in the selfie</li>
          <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-muted-foreground" /> You may not appear in the event photos</li>
        </ul>
        <Button onClick={onSearchAgain} variant="outline">
          <Scan className="mr-2 h-4 w-4" /> Try Another Selfie
        </Button>
      </div>
    </div>
  );
}

// ---- Error ----
function ErrorStage({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mx-auto max-w-lg">
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center space-y-4">
        <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
        <h2 className="text-lg font-semibold">Search failed</h2>
        <p className="text-sm text-muted-foreground">{message}</p>
        <Button onClick={onRetry} variant="outline">
          Try Again
        </Button>
      </div>
    </div>
  );
}
