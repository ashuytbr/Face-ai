'use client';

import { Event, Photo } from '@/lib/supabase';
import { EVENT_TYPE_LABELS, formatDate, formatDateTime } from '@/lib/helpers';
import { StatCard } from '@/components/dashboard/stat-card';
import { PhotoThumb } from '@/components/dashboard/signed-image';
import { Image as ImageIcon, Smile, Scan, CheckCircle2, XCircle, Clock } from 'lucide-react';

export function EventOverview({ event, photos }: { event: Event; photos: Photo[] }) {
  const processed = photos.filter((p) => p.status === 'processed').length;
  const processing = photos.filter((p) => p.status === 'processing' || p.status === 'uploaded').length;
  const failed = photos.filter((p) => p.status === 'failed').length;
  const noFaces = photos.filter((p) => p.status === 'no_faces').length;
  const recent = photos.slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Cover banner */}
      {event.cover_url && (
        <div className="relative h-48 overflow-hidden rounded-xl border border-border sm:h-64">
          <img src={event.cover_url} alt={event.name} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Photos" value={photos.length} icon={<ImageIcon className="h-5 w-5" />} />
        <StatCard label="Faces Indexed" value={event.total_faces} icon={<Smile className="h-5 w-5" />} />
        <StatCard label="Guest Searches" value={event.total_searches} icon={<Scan className="h-5 w-5" />} />
        <StatCard label="Indexed" value={processed} icon={<CheckCircle2 className="h-5 w-5" />} />
      </div>

      {/* Processing status summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm"><Clock className="h-4 w-4 text-warning" /><span>Processing</span></div>
          <p className="mt-2 text-2xl font-bold">{processing}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-success" /><span>No Faces Found</span></div>
          <p className="mt-2 text-2xl font-bold">{noFaces}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm"><XCircle className="h-4 w-4 text-destructive" /><span>Failed</span></div>
          <p className="mt-2 text-2xl font-bold">{failed}</p>
        </div>
      </div>

      {/* Event details */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold">Event Details</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Type</dt><dd>{EVENT_TYPE_LABELS[event.event_type]}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Date</dt><dd>{formatDate(event.event_date)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Venue</dt><dd>{event.venue || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Photographer</dt><dd>{event.photographer_name || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Visibility</dt><dd className="capitalize">{event.visibility.replace('_', ' ')}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Expires</dt><dd>{formatDateTime(event.expires_at)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Similarity Threshold</dt><dd>{(event.similarity_threshold * 100).toFixed(0)}%</dd></div>
          </dl>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold">Feature Toggles</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Selfie Matching</dt><dd>{event.selfi_match_enabled ? 'Enabled' : 'Disabled'}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Downloads</dt><dd>{event.downloads_enabled ? 'Enabled' : 'Disabled'}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Watermark</dt><dd>{event.watermark_enabled ? event.watermark_text || 'Enabled' : 'Disabled'}</dd></div>
          </dl>
        </div>
      </div>

      {/* Recent photos */}
      {recent.length > 0 && (
        <div className="rounded-xl border border-border bg-card">
          <h3 className="border-b border-border p-4 text-sm font-semibold">Recent Photos</h3>
          <div className="grid grid-cols-4 gap-2 p-4 sm:grid-cols-8">
            {recent.map((photo) => (
              <div key={photo.id} className="aspect-square overflow-hidden rounded-md bg-secondary">
                <PhotoThumb photo={photo} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
