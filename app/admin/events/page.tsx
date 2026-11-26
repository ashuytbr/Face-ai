'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase, Event } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Search, Loader2, Ban, CheckCircle2, ExternalLink, ImageIcon } from 'lucide-react';
import { formatDate, EVENT_TYPE_LABELS } from '@/lib/helpers';

export default function AdminEventsPage() {
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase.from('events').select('*').order('created_at', { ascending: false });
      if (error) { toast({ title: 'Load failed', variant: 'destructive' }); setLoading(false); return; }
      setEvents(data as Event[]);
      setLoading(false);
    }
    load();
  }, [toast]);

  const toggleSuspend = async (e: Event) => {
    const { error } = await supabase.from('events').update({ is_suspended: !e.is_suspended }).eq('id', e.id);
    if (error) { toast({ title: 'Action failed', variant: 'destructive' }); return; }
    setEvents((prev) => prev.map((ev) => (ev.id === e.id ? { ...ev, is_suspended: !ev.is_suspended } : ev)));
    toast({ title: e.is_suspended ? 'Event reinstated' : 'Event suspended' });
  };

  const filtered = events.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">All Events</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage all events across the platform.</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search events..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/30">
            <tr className="text-left text-muted-foreground">
              <th className="p-3 font-medium">Event</th>
              <th className="hidden p-3 font-medium sm:table-cell">Type</th>
              <th className="hidden p-3 font-medium sm:table-cell">Date</th>
              <th className="hidden p-3 font-medium lg:table-cell">Photos</th>
              <th className="hidden p-3 font-medium lg:table-cell">Searches</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((e) => (
              <tr key={e.id} className="hover:bg-secondary/30">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 flex-shrink-0 rounded-lg bg-secondary" style={e.cover_url ? { backgroundImage: `url(${e.cover_url})`, backgroundSize: 'cover' } : {}} />
                    <span className="font-medium">{e.name}</span>
                  </div>
                </td>
                <td className="hidden p-3 text-muted-foreground sm:table-cell">{EVENT_TYPE_LABELS[e.event_type]}</td>
                <td className="hidden p-3 text-muted-foreground sm:table-cell">{formatDate(e.event_date)}</td>
                <td className="hidden p-3 text-muted-foreground lg:table-cell">{e.total_photos}</td>
                <td className="hidden p-3 text-muted-foreground lg:table-cell">{e.total_searches}</td>
                <td className="p-3">
                  {e.is_suspended ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive"><Ban className="h-3 w-3" /> Suspended</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs text-success"><CheckCircle2 className="h-3 w-3" /> Active</span>
                  )}
                </td>
                <td className="p-3 text-right">
                  <div className="flex justify-end gap-1">
                    <Link href={`/e/${e.slug}`} target="_blank">
                      <Button size="icon" variant="ghost" className="h-8 w-8"><ExternalLink className="h-4 w-4" /></Button>
                    </Link>
                    <Button size="sm" variant={e.is_suspended ? 'outline' : 'destructive'} onClick={() => toggleSuspend(e)}>
                      {e.is_suspended ? 'Reinstate' : 'Suspend'}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No events found.</p>}
      </div>
    </div>
  );
}
