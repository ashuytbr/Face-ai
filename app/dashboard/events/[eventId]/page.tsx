'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useEvent, useEventPhotos, LoadingState, ErrorState } from '@/components/dashboard/use-event';
import { EventTabs } from '@/components/dashboard/event-tabs';
import { EventOverview } from '@/components/dashboard/event-overview';
import { EventProcessing } from '@/components/dashboard/event-processing';
import { EventSettings } from '@/components/dashboard/event-settings';

const EventGallery = dynamic(() => import('@/components/dashboard/event-gallery').then(m => m.EventGallery), { ssr: false });
const EventUpload = dynamic(() => import('@/components/dashboard/event-upload').then(m => m.EventUpload), { ssr: false });
const EventQR = dynamic(() => import('@/components/dashboard/event-qr').then(m => m.EventQR), { ssr: false });

export default function EventDetailsPage() {
  const { event, eventId, loading, error, reload, setEvent } = useEvent();
  const { photos, loading: photosLoading } = useEventPhotos(eventId);
  const [tab, setTab] = useState('overview');

  if (loading) return <LoadingState />;
  if (error || !event) return <ErrorState message={error ?? 'Event not found'} />;

  return (
    <div className="space-y-6">
      <EventTabs tab={tab} onTabChange={setTab} event={event} photoCount={photos.length} />
      {tab === 'overview' && <EventOverview event={event} photos={photos} />}
      {tab === 'gallery' && <EventGallery event={event} photos={photos} loading={photosLoading} />}
      {tab === 'upload' && <EventUpload event={event} photos={photos} onUploaded={() => { reload(); }} />}
      {tab === 'processing' && <EventProcessing event={event} photos={photos} />}
      {tab === 'qr' && <EventQR event={event} />}
      {tab === 'settings' && <EventSettings event={event} onUpdate={setEvent} />}
    </div>
  );
}
