'use client';

import { useState, useCallback, useRef } from 'react';
import { Event, Photo, STORAGE_BUCKET, supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth/auth-provider';
import { fileHash, formatBytes } from '@/lib/helpers';
import {
  Upload,
  FileImage,
  X,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface UploadItem {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error' | 'duplicate';
  error?: string;
  storageKey?: string;
}

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const ACCEPTED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export function EventUpload({ event, photos, onUploaded }: { event: Event; photos: Photo[]; onUploaded: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const existingHashes = new Set(photos.map((p) => p.file_hash).filter(Boolean));

  const addFiles = useCallback(async (fileList: File[]) => {
    const valid: UploadItem[] = [];
    for (const file of fileList) {
      const id = `${file.name}-${file.size}-${Date.now()}-${Math.random()}`;
      if (!ACCEPTED.includes(file.type)) {
        valid.push({ file, id, progress: 0, status: 'error', error: 'Unsupported file type' });
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        valid.push({ file, id, progress: 0, status: 'error', error: `File exceeds ${formatBytes(MAX_FILE_SIZE)}` });
        continue;
      }
      const hash = await fileHash(file);
      if (existingHashes.has(hash)) {
        valid.push({ file, id, progress: 100, status: 'duplicate' });
        continue;
      }
      valid.push({ file, id, progress: 0, status: 'pending' });
    }
    setItems((prev) => [...prev, ...valid]);
  }, [existingHashes]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
  }, [addFiles]);

  const uploadAll = async () => {
    if (!user) return;
    setUploading(true);
    const pending = items.filter((i) => i.status === 'pending');

    for (const item of pending) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: 'uploading', progress: 0 } : i)));

      try {
        const hash = await fileHash(item.file);
        const ext = item.file.name.split('.').pop();
        const storageKey = `${user.id}/${event.id}/${hash}.${ext}`;

        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, progress: 30 } : i)));

        const { error: upErr } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(storageKey, item.file, {
            contentType: item.file.type,
            upsert: false,
          });

        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, progress: 80 } : i)));

        if (upErr) {
          if (upErr.message.includes('already')) {
            setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: 'duplicate', progress: 100 } : i)));
            continue;
          }
          throw upErr;
        }

        const { error: dbErr } = await supabase.from('photos').insert({
          event_id: event.id,
          user_id: user.id,
          storage_key: storageKey,
          file_name: item.file.name,
          file_size: item.file.size,
          mime_type: item.file.type,
          file_hash: hash,
          status: 'uploaded',
        });

        if (dbErr) throw dbErr;

        try {
          await supabase.rpc('upsert_storage_usage', { p_user_id: user.id, p_event_id: event.id, p_bytes: item.file.size, p_files: 1 });
        } catch {
          await supabase.from('storage_usage').upsert({
            user_id: user.id,
            event_id: event.id,
            bytes_used: item.file.size,
            file_count: 1,
          }, { onConflict: 'user_id,event_id' });
        }

        const { data: insertedPhoto } = await supabase.from('photos').select('id').eq('storage_key', storageKey).maybeSingle();
        if (insertedPhoto?.id) {
          try {
            await supabase.from('processing_jobs').insert({
              photo_id: insertedPhoto.id,
              event_id: event.id,
              user_id: user.id,
              job_type: 'face_index',
              status: 'queued',
            });
          } catch {}
        }

        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: 'done', progress: 100, storageKey } : i)));
      } catch (err) {
        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: 'error', error: err instanceof Error ? err.message : 'Upload failed' } : i)));
      }
    }

    setUploading(false);
    onUploaded();
    toast({ title: 'Upload complete', description: 'Photos are being queued for face indexing.' });
  };

  const retryItem = async (id: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status: 'pending', error: undefined, progress: 0 } : i)));
  };

  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));
  const clearCompleted = () => setItems((prev) => prev.filter((i) => i.status === 'pending' || i.status === 'uploading' || i.status === 'error'));

  const pendingCount = items.filter((i) => i.status === 'pending').length;
  const doneCount = items.filter((i) => i.status === 'done').length;
  const errorCount = items.filter((i) => i.status === 'error').length;
  const dupCount = items.filter((i) => i.status === 'duplicate').length;

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 text-center transition-colors ${
          dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
        }`}
      >
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Upload className="h-8 w-8 text-primary" />
        </div>
        <h3 className="font-semibold">Drag & drop photos here</h3>
        <p className="mt-1 text-sm text-muted-foreground">or click to browse · JPG, PNG, WEBP up to {formatBytes(MAX_FILE_SIZE)}</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => { if (e.target.files) addFiles(Array.from(e.target.files)); e.target.value = ''; }}
        />
      </div>

      {/* Upload button */}
      {items.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>{items.length} files</span>
            {doneCount > 0 && <span className="text-success">{doneCount} done</span>}
            {errorCount > 0 && <span className="text-destructive">{errorCount} failed</span>}
            {dupCount > 0 && <span className="text-warning">{dupCount} duplicates</span>}
            {pendingCount > 0 && <span>{pendingCount} pending</span>}
          </div>
          <div className="flex gap-2">
            {items.some((i) => i.status !== 'pending' && i.status !== 'uploading') && (
              <Button variant="outline" size="sm" onClick={clearCompleted}>Clear completed</Button>
            )}
            <Button size="sm" onClick={uploadAll} disabled={uploading || pendingCount === 0}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              <span className="ml-1.5">Upload {pendingCount > 0 ? pendingCount : ''}</span>
            </Button>
          </div>
        </div>
      )}

      {/* File list */}
      {items.length > 0 && (
        <div className="max-h-96 space-y-2 overflow-y-auto rounded-xl border border-border bg-card p-3">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-secondary">
                {item.status === 'done' ? <CheckCircle2 className="h-5 w-5 text-success" />
                  : item.status === 'error' ? <XCircle className="h-5 w-5 text-destructive" />
                  : item.status === 'duplicate' ? <AlertCircle className="h-5 w-5 text-warning" />
                  : item.status === 'uploading' ? <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  : <FileImage className="h-5 w-5 text-muted-foreground" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.file.name}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(item.file.size)}</p>
                {item.error && <p className="text-xs text-destructive">{item.error}</p>}
                {item.status === 'duplicate' && <p className="text-xs text-warning">Already uploaded</p>}
                {item.status === 'uploading' && <Progress value={item.progress} className="mt-1 h-1" />}
              </div>
              {item.status === 'error' && (
                <Button size="sm" variant="outline" onClick={() => retryItem(item.id)}>Retry</Button>
              )}
              {item.status !== 'uploading' && (
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeItem(item.id)}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
