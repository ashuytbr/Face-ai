'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/components/auth/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { supabase, AVATAR_BUCKET } from '@/lib/supabase';
import { Loader2, Save, Upload, User } from 'lucide-react';

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    display_name: profile?.display_name ?? '',
    studio_name: profile?.studio_name ?? '',
    bio: profile?.bio ?? '',
    portfolio_url: profile?.portfolio_url ?? '',
    avatar_url: profile?.avatar_url ?? '',
  });

  const update = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const key = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(key, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(key);
      update('avatar_url', urlData.publicUrl);
    } catch (err) {
      toast({ title: 'Upload failed', description: err instanceof Error ? err.message : 'Error', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('photographer_profiles')
        .update({
          display_name: form.display_name,
          studio_name: form.studio_name || null,
          bio: form.bio || null,
          portfolio_url: form.portfolio_url || null,
          avatar_url: form.avatar_url || null,
        })
        .eq('user_id', user!.id);
      if (error) throw error;
      await refreshProfile();
      toast({ title: 'Profile saved' });
    } catch (err) {
      toast({ title: 'Save failed', description: err instanceof Error ? err.message : 'Error', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your public photographer profile.</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-6">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-primary/20">
            {form.avatar_url ? (
              <img src={form.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <User className="h-8 w-8 text-primary" />
            )}
          </div>
          <div>
            <Label className="mb-2 block">Profile Image</Label>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-secondary">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Upload
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
            </label>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Display Name</Label>
          <Input value={form.display_name} onChange={(e) => update('display_name', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Studio Name</Label>
          <Input value={form.studio_name} onChange={(e) => update('studio_name', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Bio</Label>
          <Textarea value={form.bio} onChange={(e) => update('bio', e.target.value)} rows={3} placeholder="Tell guests about your photography style..." />
        </div>
        <div className="space-y-2">
          <Label>Portfolio URL</Label>
          <Input value={form.portfolio_url} onChange={(e) => update('portfolio_url', e.target.value)} placeholder="https://yourportfolio.com" />
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span className="ml-1.5">Save Profile</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
