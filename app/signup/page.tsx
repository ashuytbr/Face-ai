'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/brand/logo';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock, User, ArrowLeft, Building2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/auth-provider';

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [studioName, setStudioName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: 'Password too short', description: 'Password must be at least 6 characters.', variant: 'destructive' });
      return;
    }
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName, studio_name: studioName },
        },
      });

      if (error) throw error;
      if (!data.user) throw new Error('Failed to create account.');

      const { error: profileError } = await supabase.from('photographer_profiles').insert({
        user_id: data.user.id,
        display_name: displayName,
        studio_name: studioName || null,
        role: 'photographer',
      });

      if (profileError) {
        console.error('Profile creation error:', profileError);
      }

      // Refresh auth context with explicit user ID so profile loads before redirect
      await refreshProfile(data.user.id);

      toast({
        title: 'Account created!',
        description: 'Welcome to PODDAR PIX. Your dashboard is ready.',
      });

      router.push('/dashboard');
    } catch (err) {
      toast({
        title: 'Sign up failed',
        description: err instanceof Error ? err.message : 'Could not create account.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex flex-col items-center">
            <Link href="/" className="mb-8">
              <Logo size="lg" />
            </Link>
            <h1 className="text-2xl font-bold">Create your account</h1>
            <p className="mt-2 text-sm text-muted-foreground">Start delivering photos with AI face search</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-6 sm:p-8">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display name</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="displayName"
                  placeholder="Jane Photographer"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="studioName">Studio name (optional)</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="studioName"
                  placeholder="Acme Photography"
                  value={studioName}
                  onChange={(e) => setStudioName(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9"
                  required
                  autoComplete="new-password"
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create account'}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              By signing up, you agree to handle biometric data responsibly and obtain guest consent.
            </p>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </div>

          <div className="mt-6 text-center">
            <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-3 w-3" /> Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
