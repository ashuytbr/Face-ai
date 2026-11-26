'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/components/auth/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Loader2, Lock, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast({ title: 'Password too short', description: 'Minimum 6 characters.', variant: 'destructive' });
      return;
    }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: 'Password updated' });
      setNewPassword('');
    } catch (err) {
      toast({ title: 'Update failed', description: err instanceof Error ? err.message : 'Error', variant: 'destructive' });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Account security and preferences.</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h3 className="font-semibold">Account</h3>
        <div className="space-y-1 text-sm">
          <p className="text-muted-foreground">Email</p>
          <p className="font-medium">{user?.email}</p>
        </div>
        <div className="space-y-1 text-sm">
          <p className="text-muted-foreground">Account ID</p>
          <p className="font-mono text-xs">{user?.id}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h3 className="font-semibold">Change Password</h3>
        <div className="space-y-2">
          <Label>New Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input type="password" placeholder="At least 6 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="pl-9" />
          </div>
        </div>
        <Button onClick={handleChangePassword} disabled={savingPassword || !newPassword}>
          {savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update Password'}
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h3 className="font-semibold">Session</h3>
        <p className="text-sm text-muted-foreground">Sign out of your account on this device.</p>
        <Button variant="outline" onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" /> Sign Out
        </Button>
      </div>

      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 space-y-4">
        <h3 className="font-semibold text-destructive">Delete Account</h3>
        <p className="text-sm text-muted-foreground">
          Permanently delete your account and all associated data including events, photos, and face embeddings.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">Delete Account</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your account?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes all your events, photos, face embeddings, and profile data. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={async () => {
                  toast({ title: 'Please contact support', description: 'Account deletion requires verification. Email support@poddarpix.com.' });
                }}
              >
                I understand
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
