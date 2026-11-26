'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase, PhotographerProfile, Event } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Calendar, ImageIcon, Ban, CheckCircle2, ExternalLink } from 'lucide-react';
import { timeAgo, formatBytes } from '@/lib/helpers';

export default function AdminPhotographersPage() {
  const { toast } = useToast();
  const [photographers, setPhotographers] = useState<(PhotographerProfile & { event_count?: number; photo_count?: number; storage?: number })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: profiles, error } = await supabase
        .from('photographer_profiles')
        .select('*')
        .eq('role', 'photographer')
        .order('created_at', { ascending: false });
      if (error) { toast({ title: 'Load failed', variant: 'destructive' }); setLoading(false); return; }

      const enriched = await Promise.all(
        (profiles as PhotographerProfile[]).map(async (p) => {
          const { count: event_count } = await supabase.from('events').select('*', { count: 'exact', head: true }).eq('user_id', p.user_id);
          const { count: photo_count } = await supabase.from('photos').select('*', { count: 'exact', head: true }).eq('user_id', p.user_id);
          const { data: storage } = await supabase.from('storage_usage').select('bytes_used').eq('user_id', p.user_id);
          const storage_bytes = storage?.reduce((sum, s) => sum + (s as { bytes_used: number }).bytes_used, 0) ?? 0;
          return { ...p, event_count: event_count ?? 0, photo_count: photo_count ?? 0, storage: storage_bytes };
        })
      );
      setPhotographers(enriched);
      setLoading(false);
    }
    load();
  }, [toast]);

  const toggleSuspend = async (p: PhotographerProfile) => {
    const { error } = await supabase.from('photographer_profiles').update({ is_suspended: !p.is_suspended }).eq('id', p.id);
    if (error) { toast({ title: 'Action failed', variant: 'destructive' }); return; }
    setPhotographers((prev) => prev.map((u) => (u.id === p.id ? { ...u, is_suspended: !u.is_suspended } : u)));
    toast({ title: p.is_suspended ? 'Photographer reinstated' : 'Photographer suspended' });
  };

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Photographers</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage all photographer accounts.</p>
      </div>

      {photographers.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <p className="text-sm text-muted-foreground">No photographers yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {photographers.map((p) => (
            <div key={p.id} className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-lg font-medium text-primary">
                  {p.display_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{p.display_name}</p>
                  <p className="truncate text-xs text-muted-foreground">{p.studio_name || 'Independent'}</p>
                </div>
                {p.is_suspended ? (
                  <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">Suspended</span>
                ) : (
                  <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs text-success">Active</span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg border border-border p-2">
                  <Calendar className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
                  <div className="text-sm font-semibold">{p.event_count}</div>
                  <div className="text-[10px] text-muted-foreground">Events</div>
                </div>
                <div className="rounded-lg border border-border p-2">
                  <ImageIcon className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
                  <div className="text-sm font-semibold">{p.photo_count}</div>
                  <div className="text-[10px] text-muted-foreground">Photos</div>
                </div>
                <div className="rounded-lg border border-border p-2">
                  <div className="mb-1 text-xs font-semibold text-muted-foreground">{formatBytes(p.storage ?? 0)}</div>
                  <div className="text-[10px] text-muted-foreground">Storage</div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant={p.is_suspended ? 'outline' : 'destructive'} className="flex-1" onClick={() => toggleSuspend(p)}>
                  {p.is_suspended ? 'Reinstate' : 'Suspend'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Joined {timeAgo(p.created_at)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
