'use client';

import { useEffect, useState } from 'react';
import { supabase, STORAGE_BUCKET, Photo } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export function SignedImage({
  storageKey,
  bucket = STORAGE_BUCKET,
  alt = '',
  className,
  expiresIn = 3600,
}: {
  storageKey: string;
  bucket?: string;
  alt?: string;
  className?: string;
  expiresIn?: number;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(storageKey, expiresIn);
      if (!active) return;
      if (error || !data?.signedUrl) {
        setError(true);
        setLoading(false);
        return;
      }
      setUrl(data.signedUrl);
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [storageKey, bucket, expiresIn]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-secondary ${className ?? ''}`}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error || !url) {
    return <div className={`flex items-center justify-center bg-secondary text-xs text-muted-foreground ${className ?? ''}`}>Failed to load</div>;
  }
  return <img src={url} alt={alt} className={className} loading="lazy" />;
}

export function PhotoThumb({ photo, bucket = STORAGE_BUCKET }: { photo: Photo; bucket?: string }) {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <SignedImage storageKey={photo.storage_key} bucket={bucket} alt={photo.file_name} className="h-full w-full object-cover" />
      <div className="absolute bottom-1 right-1 rounded bg-background/80 px-1.5 py-0.5 text-[10px] font-medium">
        {photo.face_count > 0 ? `${photo.face_count}👤` : '—'}
      </div>
    </div>
  );
}
