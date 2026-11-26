'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Event, supabase, COVER_BUCKET } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Trash2, Upload, X } from 'lucide-react';

export function EventSettings({ event, onUpdate }: { event: Event; onUpdate: (e: Event) => void }) {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [form, setForm] = useState({
    name: event.name,
    event_type: event.event_type,
    event_date: event.event_date ?? '',
    venue: event.venue ?? '',
    photographer_name: event.photographer_name ?? '',
    visibility: event.visibility,
    expires_at: event.expires_at ? new Date(event.expires_at).toISOString().slice(0, 16) : '',
    selfi_match_enabled: event.selfi_match_enabled,
    downloads_enabled: event.downloads_enabled,
    watermark_enabled: event.watermark_enabled,
    watermark_text: event.watermark_text ?? '',
    similarity_threshold: event.similarity_threshold,
    cover_url: event.cover_url,
  });

  const update = (field: string, value: unknown) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const ext = file.name.split('.').pop();
      const key = `${event.user_id}/covers/${event.slug}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from(COVER_BUCKET).upload(key, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from(COVER_BUCKET).getPublicUrl(key);
      update('cover_url', urlData.publicUrl);
      toast({ title: 'Cover updated' });
    } catch (err) {
      toast({ title: 'Upload failed', description: err instanceof Error ? err.message : 'Error', variant: 'destructive' });
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .update({
          name: form.name,
          event_type: form.event_type,
          event_date: form.event_date || null,
          venue: form.venue || null,
          photographer_name: form.photographer_name || null,
          visibility: form.visibility,
          expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
          selfi_match_enabled: form.selfi_match_enabled,
          downloads_enabled: form.downloads_enabled,
          watermark_enabled: form.watermark_enabled,
          watermark_text: form.watermark_text || null,
          similarity_threshold: form.similarity_threshold,
          cover_url: form.cover_url,
        })
        .eq('id', event.id)
        .select()
        .single();
      if (error) throw error;
      onUpdate(data as Event);
      toast({ title: 'Settings saved' });
    } catch (err) {
      toast({ title: 'Save failed', description: err instanceof Error ? err.message : 'Error', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.from('events').delete().eq('id', event.id);
      if (error) throw error;
      toast({ title: 'Event deleted' });
      router.push('/dashboard/events');
    } catch (err) {
      toast({ title: 'Delete failed', description: err instanceof Error ? err.message : 'Error', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h3 className="font-semibold">Cover Photo</h3>
        {form.cover_url ? (
          <div className="relative h-40 overflow-hidden rounded-lg">
            <img src={form.cover_url} alt="Cover" className="h-full w-full object-cover" />
            <Button type="button" variant="destructive" size="icon" className="absolute right-2 top-2 h-8 w-8" onClick={() => update('cover_url', null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <label className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border hover:border-primary/50">
            {uploadingCover ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : <Upload className="h-5 w-5 text-muted-foreground" />}
            <span className="mt-1 text-sm text-muted-foreground">Upload cover</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
          </label>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h3 className="font-semibold">Event Details</h3>
        <div className="space-y-2">
          <Label>Event Name</Label>
          <Input value={form.name} onChange={(e) => update('name', e.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Event Type</Label>
            <Select value={form.event_type} onValueChange={(v) => update('event_type', v)}>
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
            <Label>Event Date</Label>
            <Input type="date" value={form.event_date} onChange={(e) => update('event_date', e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Venue</Label>
          <Input value={form.venue} onChange={(e) => update('venue', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Photographer Name</Label>
          <Input value={form.photographer_name} onChange={(e) => update('photographer_name', e.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Visibility</Label>
            <Select value={form.visibility} onValueChange={(v) => update('visibility', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="link_only">Link / QR Only</SelectItem>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Expiry Date</Label>
            <Input type="datetime-local" value={form.expires_at} onChange={(e) => update('expires_at', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h3 className="font-semibold">Feature Settings</h3>
        <div className="flex items-center justify-between">
          <div><Label>Selfie Matching</Label><p className="text-xs text-muted-foreground">Allow guests to search by selfie</p></div>
          <Switch checked={form.selfi_match_enabled} onCheckedChange={(v) => update('selfi_match_enabled', v)} />
        </div>
        <div className="flex items-center justify-between">
          <div><Label>Downloads</Label><p className="text-xs text-muted-foreground">Allow guests to download photos</p></div>
          <Switch checked={form.downloads_enabled} onCheckedChange={(v) => update('downloads_enabled', v)} />
        </div>
        <div className="flex items-center justify-between">
          <div><Label>Watermark</Label><p className="text-xs text-muted-foreground">Overlay watermark on previews</p></div>
          <Switch checked={form.watermark_enabled} onCheckedChange={(v) => update('watermark_enabled', v)} />
        </div>
        {form.watermark_enabled && (
          <div className="space-y-2">
            <Label>Watermark Text</Label>
            <Input value={form.watermark_text} onChange={(e) => update('watermark_text', e.target.value)} placeholder="© Your Studio" />
          </div>
        )}
        <div className="space-y-2">
          <Label>Similarity Threshold: {(form.similarity_threshold * 100).toFixed(0)}%</Label>
          <Slider
            value={[form.similarity_threshold * 100]}
            onValueChange={(v) => update('similarity_threshold', v[0] / 100)}
            min={30}
            max={90}
            step={5}
          />
          <p className="text-xs text-muted-foreground">Lower = more matches (may include false positives). Higher = stricter matching.</p>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          <span className="ml-1.5">Save Changes</span>
        </Button>
      </div>

      {/* Danger zone */}
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
        <h3 className="font-semibold text-destructive">Danger Zone</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Deleting an event permanently removes all photos, face embeddings, and guest search data.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="mt-4">
              <Trash2 className="mr-2 h-4 w-4" /> Delete Event
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete "{event.name}"?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete all {event.total_photos} photos, face embeddings, and search data. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete permanently'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
