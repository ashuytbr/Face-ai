'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { supabase, Event, Photo } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export function useEvent() {
  const params = useParams();
  const eventId = params.eventId as string;
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEvent = useCallback(async () => {
    if (!eventId) return;
    const { data, error } = await supabase.from('events').select('*').eq('id', eventId).maybeSingle();
    if (error) {
      setError(error.message);
    } else if (!data) {
      setError('Event not found');
    } else {
      setEvent(data as Event);
    }
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  return { event, eventId, loading, error, reload: loadEvent, setEvent };
}

export function useEventPhotos(eventId: string | undefined) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!eventId) return;
    const { data } = await supabase
      .from('photos')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });
    setPhotos(data as Photo[]);
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    load();
    if (!eventId) return;
    const channel = supabase
      .channel(`photos-${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'photos', filter: `event_id=eq.${eventId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [eventId, load]);

  return { photos, loading, reload: load };
}

export function LoadingState() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex h-[60vh] flex-col items-center justify-center text-center">
      <p className="text-lg font-semibold text-destructive">{message}</p>
    </div>
  );
}
