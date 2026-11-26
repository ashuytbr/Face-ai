'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth/auth-provider';
import { supabase, Event } from '@/lib/supabase';
import { formatDate, EVENT_TYPE_LABELS } from '@/lib/helpers';
import { Loader2, Plus, Calendar, MapPin, ImageIcon, Search, QrCode } from 'lucide-react';

export default function EventsPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      if (!user) return;
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) console.error('Events load error:', error);
      setEvents(data as Event[]);
      setLoading(false);
    }
    load();
  }, [user]);

  const filtered = events.filter(
    (e) => e.name.toLowerCase().includes(search.toLowerCase()) || e.venue?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Events</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage all your photography events.</p>
        </div>
        <Link href="/dashboard/events/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create New Event
          </Button>
        </Link>
      </div>

      {events.length > 0 && (
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-4 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      )}

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
            <Calendar className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold">No events yet</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Create your first event to start uploading photos and delivering them to guests with AI face search.
          </p>
          <Link href="/dashboard/events/new" className="mt-4">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Event
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((event) => (
            <Link
              key={event.id}
              href={`/dashboard/events/${event.id}`}
              className="group overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/50"
            >
              <div
                className="relative h-40 bg-cover bg-center"
                style={event.cover_url ? { backgroundImage: `url(${event.cover_url})` } : { background: 'linear-gradient(135deg, hsl(var(--primary)/0.3), hsl(var(--secondary)))' }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
                <div className="absolute bottom-3 left-3 flex items-center gap-2">
                  <span className="rounded-full bg-primary/90 px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
                    {EVENT_TYPE_LABELS[event.event_type]}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <h3 className="truncate font-semibold group-hover:text-primary">{event.name}</h3>
                <div className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" /> {formatDate(event.event_date)}
                  </span>
                  {event.venue && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" /> {event.venue}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5" /> {event.total_photos} photos · {event.total_searches} searches
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
