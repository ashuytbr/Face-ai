'use client';

import { Event, Photo } from '@/lib/supabase';
import { PHOTO_STATUS_LABELS, timeAgo } from '@/lib/helpers';
import { Loader2, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';

export function EventProcessing({ event, photos }: { event: Event; photos: Photo[] }) {
  const queued = photos.filter((p) => p.status === 'uploaded');
  const processing = photos.filter((p) => p.status === 'processing');
  const processed = photos.filter((p) => p.status === 'processed');
  const failed = photos.filter((p) => p.status === 'failed');
  const noFaces = photos.filter((p) => p.status === 'no_faces');

  const total = photos.length;
  const done = processed.length + noFaces.length;
  const progress = total > 0 ? (done / total) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">Indexing Progress</h3>
          <span className="text-sm text-muted-foreground">{done}/{total} processed</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatusPill icon={<Clock className="h-4 w-4 text-muted-foreground" />} label="Queued" count={queued.length} />
          <StatusPill icon={<Loader2 className="h-4 w-4 animate-spin text-primary" />} label="Processing" count={processing.length} />
          <StatusPill icon={<CheckCircle2 className="h-4 w-4 text-success" />} label="Indexed" count={processed.length} />
          <StatusPill icon={<AlertCircle className="h-4 w-4 text-warning" />} label="No Faces" count={noFaces.length} />
          <StatusPill icon={<XCircle className="h-4 w-4 text-destructive" />} label="Failed" count={failed.length} />
        </div>
      </div>

      {/* Processing pipeline explanation */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-4 text-sm font-semibold">How Face Indexing Works</h3>
        <div className="space-y-3 text-sm text-muted-foreground">
          {[
            '1. Photos are uploaded to private storage.',
            '2. The processing service reads each photo and detects faces using InsightFace + ONNX Runtime.',
            '3. For each detected face, a 512-dimensional embedding is generated.',
            '4. Embeddings are stored in pgvector, scoped to this event only.',
            '5. When a guest searches with a selfie, their face embedding is compared against this event\'s embeddings using cosine similarity.',
          ].map((step, i) => (
            <p key={i}>{step}</p>
          ))}
        </div>
      </div>

      {/* Photo list with status */}
      {photos.length > 0 && (
        <div className="rounded-xl border border-border bg-card">
          <h3 className="border-b border-border p-4 text-sm font-semibold">Photo Status</h3>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="p-3 font-medium">File</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Faces</th>
                  <th className="p-3 font-medium">Uploaded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {photos.slice(0, 50).map((photo) => (
                  <tr key={photo.id} className="hover:bg-secondary/30">
                    <td className="max-w-[200px] truncate p-3">{photo.file_name}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs ${
                        photo.status === 'processed' ? 'bg-success/10 text-success'
                        : photo.status === 'failed' ? 'bg-destructive/10 text-destructive'
                        : photo.status === 'no_faces' ? 'bg-warning/10 text-warning'
                        : 'bg-secondary text-muted-foreground'
                      }`}>
                        {PHOTO_STATUS_LABELS[photo.status]}
                      </span>
                    </td>
                    <td className="p-3">{photo.face_count}</td>
                    <td className="p-3 text-muted-foreground">{timeAgo(photo.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {photos.length > 50 && <p className="p-3 text-center text-xs text-muted-foreground">Showing 50 of {photos.length}</p>}
        </div>
      )}
    </div>
  );
}

function StatusPill({ icon, label, count }: { icon: React.ReactNode; label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
      {icon}
      <div>
        <div className="text-sm font-semibold">{count}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
