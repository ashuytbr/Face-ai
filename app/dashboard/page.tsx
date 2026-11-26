'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/dashboard/stat-card';
import { useAuth } from '@/components/auth/auth-provider';
import { supabase, PhotographerStats, Event } from '@/lib/supabase';
import { formatBytes, formatDate, timeAgo, EVENT_TYPE_LABELS } from '@/lib/helpers';
import {
  Calendar,
  Image as ImageIcon,
  Loader2,
  Scan,
  HardDrive,
  Smile,
  Plus,
  ArrowRight,
  CircleDot,
} from 'lucide-react';

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState<PhotographerStats | null>(null);
  const [recentEvents, setRecentEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const { data: statsData } = await supabase.rpc('get_photographer_stats', { p_user_id: user.id });
        setStats(statsData as PhotographerStats);

        const { data: events } = await supabase
          .from('events')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        setRecentEvents(events as Event[]);
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back, {profile?.display_name?.split(' ')[0] ?? 'Photographer'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Here&apos;s what&apos;s happening with your events.</p>
        </div>
        <Link href="/dashboard/events/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create New Event
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total Events" value={stats?.total_events ?? 0} icon={<Calendar className="h-5 w-5" />} />
        <StatCard label="Photos Uploaded" value={stats?.total_photos ?? 0} icon={<ImageIcon className="h-5 w-5" />} />
        <StatCard label="Processing" value={stats?.photos_processing ?? 0} icon={<Loader2 className="h-5 w-5" />} />
        <StatCard label="Faces Indexed" value={stats?.total_faces ?? 0} icon={<Smile className="h-5 w-5" />} />
        <StatCard label="Guest Searches" value={stats?.total_searches ?? 0} icon={<Scan className="h-5 w-5" />} />
        <StatCard
          label="Storage Used"
          value={formatBytes(stats?.storage_bytes ?? 0)}
          icon={<HardDrive className="h-5 w-5" />}
        />
      </div>

      {/* Storage usage bar */}
      {profile && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="font-medium">Storage Usage</span>
            <span className="text-muted-foreground">
              {formatBytes(stats?.storage_bytes ?? 0)} / {formatBytes(profile.storage_limit_bytes)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{
                width: `${Math.min(100, ((stats?.storage_bytes ?? 0) / profile.storage_limit_bytes) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Recent events */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="font-semibold">Recent Events</h2>
          <Link href="/dashboard/events" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </div>

        {recentEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold">No events yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Create your first event to start uploading photos.</p>
            <Link href="/dashboard/events/new" className="mt-4">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Event
              </Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recentEvents.map((event) => (
              <Link
                key={event.id}
                href={`/dashboard/events/${event.id}`}
                className="flex items-center gap-4 p-4 transition-colors hover:bg-secondary/50"
              >
                <div
                  className="h-12 w-12 flex-shrink-0 rounded-lg bg-cover bg-center"
                  style={event.cover_url ? { backgroundImage: `url(${event.cover_url})` } : { background: 'hsl(var(--secondary))' }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{event.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {EVENT_TYPE_LABELS[event.event_type]} · {formatDate(event.event_date)} · {event.total_photos} photos
                  </p>
                </div>
                <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
                  <CircleDot className="h-3 w-3" />
                  {timeAgo(event.created_at)}
                </div>
                <ArrowRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
