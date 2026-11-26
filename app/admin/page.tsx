'use client';

import { useEffect, useState } from 'react';
import { supabase, AdminStats, PhotographerProfile, Event } from '@/lib/supabase';
import { StatCard } from '@/components/dashboard/stat-card';
import { formatBytes, formatDate, timeAgo, EVENT_TYPE_LABELS } from '@/lib/helpers';
import { Users, Calendar, Image as ImageIcon, HardDrive, Loader2, Scan, Shield } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentUsers, setRecentUsers] = useState<PhotographerProfile[]>([]);
  const [recentEvents, setRecentEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: statsData } = await supabase.rpc('get_admin_stats');
      setStats(statsData as AdminStats);

      const { data: users } = await supabase
        .from('photographer_profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      setRecentUsers(users as PhotographerProfile[]);

      const { data: events } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      setRecentEvents(events as Event[]);

      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Platform-wide overview.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Users" value={stats?.total_users ?? 0} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Photographers" value={stats?.total_photographers ?? 0} icon={<Shield className="h-5 w-5" />} />
        <StatCard label="Total Events" value={stats?.total_events ?? 0} icon={<Calendar className="h-5 w-5" />} />
        <StatCard label="Total Photos" value={stats?.total_photos ?? 0} icon={<ImageIcon className="h-5 w-5" />} />
        <StatCard label="Processing" value={stats?.photos_processing ?? 0} icon={<Loader2 className="h-5 w-5" />} />
        <StatCard label="Guest Searches" value={stats?.total_searches ?? 0} icon={<Scan className="h-5 w-5" />} />
        <StatCard label="Storage Used" value={formatBytes(stats?.total_storage_bytes ?? 0)} icon={<HardDrive className="h-5 w-5" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent users */}
        <div className="rounded-xl border border-border bg-card">
          <h2 className="border-b border-border p-4 text-sm font-semibold">Recent Users</h2>
          {recentUsers.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">No users yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {recentUsers.map((u) => (
                <div key={u.id} className="flex items-center gap-3 p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-sm font-medium text-primary">
                    {u.display_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{u.display_name}</p>
                    <p className="text-xs text-muted-foreground">{u.role} · {timeAgo(u.created_at)}</p>
                  </div>
                  {u.is_suspended && <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">Suspended</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent events */}
        <div className="rounded-xl border border-border bg-card">
          <h2 className="border-b border-border p-4 text-sm font-semibold">Recent Events</h2>
          {recentEvents.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">No events yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {recentEvents.map((e) => (
                <div key={e.id} className="flex items-center gap-3 p-4">
                  <div className="h-9 w-9 flex-shrink-0 rounded-lg bg-secondary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{e.name}</p>
                    <p className="text-xs text-muted-foreground">{EVENT_TYPE_LABELS[e.event_type]} · {e.total_photos} photos</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDate(e.event_date)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
