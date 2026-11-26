'use client';

import { useEffect, useState } from 'react';
import { supabase, PhotographerProfile } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Search, Loader2, Shield, Ban, CheckCircle2, ChevronRight } from 'lucide-react';
import { timeAgo } from '@/lib/helpers';

export default function AdminUsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<PhotographerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('photographer_profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) toast({ title: 'Load failed', description: error.message, variant: 'destructive' });
      setUsers(data as PhotographerProfile[]);
      setLoading(false);
    }
    load();
  }, [toast]);

  const toggleSuspend = async (user: PhotographerProfile) => {
    const { error } = await supabase
      .from('photographer_profiles')
      .update({ is_suspended: !user.is_suspended })
      .eq('id', user.id);
    if (error) {
      toast({ title: 'Action failed', variant: 'destructive' });
      return;
    }
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, is_suspended: !u.is_suspended } : u)));
    toast({ title: user.is_suspended ? 'User reinstated' : 'User suspended' });
  };

  const filtered = users.filter((u) =>
    u.display_name.toLowerCase().includes(search.toLowerCase()) ||
    (u.studio_name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">All Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage all platform users.</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/30">
            <tr className="text-left text-muted-foreground">
              <th className="p-3 font-medium">Name</th>
              <th className="hidden p-3 font-medium sm:table-cell">Role</th>
              <th className="hidden p-3 font-medium sm:table-cell">Studio</th>
              <th className="hidden p-3 font-medium lg:table-cell">Joined</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((u) => (
              <tr key={u.id} className="hover:bg-secondary/30">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary">
                      {u.display_name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium">{u.display_name}</span>
                  </div>
                </td>
                <td className="hidden p-3 sm:table-cell">
                  <span className="inline-flex items-center gap-1 text-xs">
                    {u.role === 'super_admin' && <Shield className="h-3 w-3 text-primary" />}
                    {u.role.replace('_', ' ')}
                  </span>
                </td>
                <td className="hidden p-3 text-muted-foreground sm:table-cell">{u.studio_name || '—'}</td>
                <td className="hidden p-3 text-muted-foreground lg:table-cell">{timeAgo(u.created_at)}</td>
                <td className="p-3">
                  {u.is_suspended ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                      <Ban className="h-3 w-3" /> Suspended
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs text-success">
                      <CheckCircle2 className="h-3 w-3" /> Active
                    </span>
                  )}
                </td>
                <td className="p-3 text-right">
                  {u.role !== 'super_admin' && (
                    <Button size="sm" variant={u.is_suspended ? 'outline' : 'destructive'} onClick={() => toggleSuspend(u)}>
                      {u.is_suspended ? 'Reinstate' : 'Suspend'}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No users found.</p>}
      </div>
    </div>
  );
}
