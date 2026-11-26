'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Event } from '@/lib/supabase';
import { EVENT_TYPE_LABELS, formatDate } from '@/lib/helpers';
import { Calendar, Image as ImageIcon, Upload, Loader2, QrCode, Settings, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TabInfo {
  id: string;
  label: string;
  icon: typeof Calendar;
}

const tabs: TabInfo[] = [
  { id: 'overview', label: 'Overview', icon: Calendar },
  { id: 'gallery', label: 'Gallery', icon: ImageIcon },
  { id: 'upload', label: 'Upload', icon: Upload },
  { id: 'processing', label: 'Processing', icon: Loader2 },
  { id: 'qr', label: 'QR Code', icon: QrCode },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function EventTabs({
  tab,
  onTabChange,
  event,
  photoCount,
}: {
  tab: string;
  onTabChange: (t: string) => void;
  event: Event;
  photoCount: number;
}) {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/events" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Back to events
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{event.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {EVENT_TYPE_LABELS[event.event_type]} · {formatDate(event.event_date)}
              {event.venue && ` · ${event.venue}`}
            </p>
          </div>
          <div className="flex gap-2 text-sm">
            <span className="rounded-full bg-secondary px-3 py-1 text-muted-foreground">{photoCount} photos</span>
            <span className="rounded-full bg-secondary px-3 py-1 text-muted-foreground">{event.total_searches} searches</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id)}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              tab === t.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            )}
          >
            <t.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
