'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth/auth-provider';
import { supabase, COVER_BUCKET } from '@/lib/supabase';
import { slugify, generateSlug } from '@/lib/helpers';
import { Loader2, Upload, X, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CreateEventPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [eventType, setEventType] = useState('wedding');
  const [eventDate, setEventDate] = useState('');
  const [venue, setVenue] = useState('');
  const [visibility, setVisibility] = useState('link_only');
  const [slug, setSlug] = useState(generateSlug());
  const [expiresAt, setExpiresAt] = useState('');
  const [photographerName, setPhotographerName] = useState(profile?.display_name ?? '');
  const [selfiMatch, setSelfiMatch] = useState(true);
  const [downloads, setDownloads] = useState(true);
  const [watermark, setWatermark] = useState(false);
  const [watermarkText, setWatermarkText] = useState('');

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingCover(true);
    try {
      const ext = file.name.split('.').pop();
      const key = `${user.id}/covers/${slug}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from(COVER_BUCKET).upload(key, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from(COVER_BUCKET).getPublicUrl(key);
      setCoverUrl(urlData.publicUrl);
      toast({ title: 'Cover uploaded' });
    } catch (err) {
      toast({ title: 'Upload failed', description: err instanceof Error ? err.message : 'Could not upload cover.', variant: 'destructive' });
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const finalSlug = slug || generateSlug();
      const { data, error } = await supabase
        .from('events')
        .insert({
          user_id: user.id,
          name,
          event_type: eventType,
          event_date: eventDate || null,
          venue: venue || null,
          cover_url: coverUrl,
          photographer_name: photographerName || null,
          visibility,
          slug: finalSlug,
          expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
          selfi_match_enabled: selfiMatch,
          downloads_enabled: downloads,
          watermark_enabled: watermark,
          watermark_text: watermarkText || null,
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from('storage_usage').insert({
        user_id: user.id,
        event_id: data.id,
        bytes_used: 0,
        file_count: 0,
      });

      toast({ title: 'Event created!', description: 'You can now upload photos.' });
      router.push(`/dashboard/events/${data.id}`);
    } catch (err) {
      toast({ title: 'Failed to create event', description: err instanceof Error ? err.message : 'Unknown error.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/dashboard/events" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Back to events
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Create New Event</h1>
        <p className="mt-1 text-sm text-muted-foreground">Set up a new event for photo delivery.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-border bg-card p-6">
        {/* Cover */}
        <div className="space-y-2">
          <Label>Event Cover Photo</Label>
          {coverUrl ? (
            <div className="relative h-40 overflow-hidden rounded-lg">
              <img src={coverUrl} alt="Cover" className="h-full w-full object-cover" />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute right-2 top-2 h-8 w-8"
                onClick={() => setCoverUrl(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <label className="flex h-40 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border transition-colors hover:border-primary/50">
              {uploadingCover ? (
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              ) : (
                <>
                  <Upload className="mb-2 h-6 w-6 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Click to upload a cover photo</span>
                </>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
            </label>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Event Name *</Label>
          <Input id="name" placeholder="Smith Wedding 2026" value={name} onChange={(e) => { setName(e.target.value); setSlug(slugify(e.target.value) || slug); }} required />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="type">Event Type</Label>
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="wedding">Wedding</SelectItem>
                <SelectItem value="birthday">Birthday</SelectItem>
                <SelectItem value="engagement">Engagement</SelectItem>
                <SelectItem value="corporate">Corporate</SelectItem>
                <SelectItem value="party">Party</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Event Date</Label>
            <Input id="date" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="venue">Venue</Label>
          <Input id="venue" placeholder="Grand Ballroom, NYC" value={venue} onChange={(e) => setVenue(e.target.value)} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="photographer">Photographer Name</Label>
            <Input id="photographer" placeholder="Jane Doe" value={photographerName} onChange={(e) => setPhotographerName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="visibility">Visibility</Label>
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="link_only">Link / QR Only</SelectItem>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug">Event URL Slug</Label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">/e/</span>
            <Input id="slug" value={slug} onChange={(e) => setSlug(slugify(e.target.value))} className="flex-1" />
            <Button type="button" variant="outline" size="sm" onClick={() => setSlug(generateSlug())}>
              Regenerate
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="expires">Event Expiry (optional)</Label>
          <Input id="expires" type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          <p className="text-xs text-muted-foreground">After expiry, the event becomes inaccessible to guests.</p>
        </div>

        {/* Settings */}
        <div className="space-y-4 rounded-lg border border-border p-4">
          <h3 className="text-sm font-semibold">Event Settings</h3>
          <div className="flex items-center justify-between">
            <div><Label>Selfie Matching</Label><p className="text-xs text-muted-foreground">Allow guests to search by selfie</p></div>
            <Switch checked={selfiMatch} onCheckedChange={setSelfiMatch} />
          </div>
          <div className="flex items-center justify-between">
            <div><Label>Downloads Enabled</Label><p className="text-xs text-muted-foreground">Allow guests to download photos</p></div>
            <Switch checked={downloads} onCheckedChange={setDownloads} />
          </div>
          <div className="flex items-center justify-between">
            <div><Label>Watermark</Label><p className="text-xs text-muted-foreground">Overlay watermark on previews</p></div>
            <Switch checked={watermark} onCheckedChange={setWatermark} />
          </div>
          {watermark && (
            <div className="space-y-2">
              <Label htmlFor="wm">Watermark Text</Label>
              <Input id="wm" placeholder="© Jane Doe Photography" value={watermarkText} onChange={(e) => setWatermarkText(e.target.value)} />
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Link href="/dashboard/events" className="flex-1">
            <Button type="button" variant="outline" className="w-full">Cancel</Button>
          </Link>
          <Button type="submit" className="flex-1" disabled={loading || !name}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Event'}
          </Button>
        </div>
      </form>
    </div>
  );
}
