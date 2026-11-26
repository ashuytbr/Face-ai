'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { Loader2 } from 'lucide-react';

export function ProtectedRoute({ children, requireAdmin = false }: { children: React.ReactNode; requireAdmin?: boolean }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (profile?.is_suspended) {
      router.replace('/suspended');
      return;
    }
    if (requireAdmin && profile?.role !== 'super_admin') {
      router.replace('/dashboard');
    }
  }, [user, profile, loading, router, requireAdmin]);

  // Still loading auth state or profile — show spinner
  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // User exists but profile hasn't loaded yet — wait for it
  // (this prevents rendering dashboard with null profile and crashing)
  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (profile.is_suspended) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (requireAdmin && profile.role !== 'super_admin') {
    return null;
  }

  return <>{children}</>;
}
