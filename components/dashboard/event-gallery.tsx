'use client';

import { useState, useMemo } from 'react';
import { Event, Photo, STORAGE_BUCKET, supabase } from '@/lib/supabase';
import { SignedImage, PhotoThumb } from '@/components/dashboard/signed-image';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Download, X, CheckSquare, Eye } from 'lucide-react';
import { downloadFile, PHOTO_STATUS_LABELS } from '@/lib/helpers';
import { useToast } from '@/hooks/use-toast';

export function EventGallery({ event, photos, loading }: { event: Event; photos: Photo[]; loading: boolean }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<Photo | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 24;
  const { toast } = useToast();

  const visiblePhotos = useMemo(() => photos.slice(page * pageSize, (page + 1) * pageSize), [photos, page]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const downloadOne = async (photo: Photo) => {
    setDownloading(true);
    try {
      const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(photo.storage_key, 300);
      if (error || !data?.signedUrl) throw error;
      downloadFile(data.signedUrl, photo.file_name);
      await supabase.from('download_records').insert({ photo_id: photo.id, event_id: event.id, file_size: photo.file_size });
    } catch {
      toast({ title: 'Download failed', variant: 'destructive' });
    } finally {
      setDownloading(false);
    }
  };

  const downloadSelected = async () => {
    setDownloading(true);
    try {
      for (const id of Array.from(selected)) {
        const photo = photos.find((p) => p.id === id);
        if (photo) await downloadOne(photo);
      }
      setSelected(new Set());
      toast({ title: 'Downloads started' });
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return <div className="flex h-40 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      {photos.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">{photos.length} photos · {selected.size} selected</span>
          </div>
          {selected.size > 0 && (
            <Button size="sm" onClick={downloadSelected} disabled={downloading}>
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              <span className="ml-1.5">Download Selected ({selected.size})</span>
            </Button>
          )}
        </div>
      )}

      {photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
            <Eye className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold">No photos yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">Upload photos to see them in the gallery.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {visiblePhotos.map((photo) => (
              <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-secondary">
                <PhotoThumb photo={photo} />
                <div className="absolute inset-0 bg-background/60 opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => setPreview(photo)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => downloadOne(photo)}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
                <div className="absolute left-1 top-1">
                  <Checkbox
                    checked={selected.has(photo.id)}
                    onCheckedChange={() => toggleSelect(photo.id)}
                    className="border-background bg-background/80"
                  />
                </div>
                {photo.status !== 'processed' && (
                  <div className="absolute bottom-1 left-1 rounded bg-background/80 px-1.5 py-0.5 text-[10px] font-medium">
                    {PHOTO_STATUS_LABELS[photo.status]}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {photos.length > pageSize && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                {page + 1} / {Math.ceil(photos.length / pageSize)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={(page + 1) * pageSize >= photos.length}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Preview dialog */}
      <Dialog open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-w-4xl border-border bg-card p-0">
          {preview && (
            <div className="relative">
              <div className="flex items-center justify-between border-b border-border p-3">
                <span className="truncate text-sm font-medium">{preview.file_name}</span>
                <Button size="sm" onClick={() => downloadOne(preview)} disabled={downloading}>
                  <Download className="mr-1.5 h-4 w-4" /> Download
                </Button>
              </div>
              <div className="flex max-h-[70vh] items-center justify-center bg-black/30 p-4">
                <SignedImage storageKey={preview.storage_key} alt={preview.file_name} className="max-h-[60vh] rounded-lg object-contain" />
              </div>
              <div className="flex justify-around border-t border-border p-3 text-xs text-muted-foreground">
                <span>Size: {(preview.file_size / 1024).toFixed(0)} KB</span>
                <span>Faces: {preview.face_count}</span>
                <span>Status: {PHOTO_STATUS_LABELS[preview.status]}</span>
                {preview.width && <span>{preview.width}×{preview.height}</span>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
