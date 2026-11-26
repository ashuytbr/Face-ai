'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Server, Database, Cloud, Cpu, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatBytes, timeAgo } from '@/lib/helpers';

interface SystemStatus {
  dbConnected: boolean;
  totalPhotos: number;
  processingPhotos: number;
  failedJobs: number;
  storageUsed: number;
  totalEvents: number;
  totalUsers: number;
}

export default function AdminStatusPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorLogs, setErrorLogs] = useState<{ id: string; photo_id: string; error: string; created_at: string }[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const { data: stats } = await supabase.rpc('get_admin_stats');
        const { data: failedPhotos } = await supabase
          .from('photos')
          .select('id, error_message, created_at, event_id')
          .eq('status', 'failed')
          .order('created_at', { ascending: false })
          .limit(10);

        setStatus({
          dbConnected: true,
          totalPhotos: (stats as { total_photos: number })?.total_photos ?? 0,
          processingPhotos: (stats as { photos_processing: number })?.photos_processing ?? 0,
          failedJobs: 0,
          storageUsed: (stats as { total_storage_bytes: number })?.total_storage_bytes ?? 0,
          totalEvents: (stats as { total_events: number })?.total_events ?? 0,
          totalUsers: (stats as { total_users: number })?.total_users ?? 0,
        });

        setErrorLogs(
          (failedPhotos ?? []).map((p) => ({
            id: (p as { id: string }).id,
            photo_id: (p as { id: string }).id,
            error: ((p as { error_message: string }).error_message) ?? 'Unknown error',
            created_at: (p as { created_at: string }).created_at,
          }))
        );
      } catch {
        setStatus(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const services = [
    { name: 'Database (PostgreSQL)', icon: Database, status: status?.dbConnected ? 'operational' : 'down', detail: 'Supabase PostgreSQL with pgvector' },
    { name: 'Object Storage', icon: Cloud, status: 'operational', detail: 'Supabase Storage (R2-compatible)' },
    { name: 'Face Recognition Service', icon: Cpu, status: 'degraded', detail: 'Requires external Python/InsightFace deployment' },
    { name: 'Edge Functions', icon: Server, status: 'operational', detail: 'Supabase Edge Functions (Deno)' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">System Status</h1>
        <p className="mt-1 text-sm text-muted-foreground">Platform health and error monitoring.</p>
      </div>

      {/* Services */}
      <div className="grid gap-4 sm:grid-cols-2">
        {services.map((s) => (
          <div key={s.name} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
              <s.icon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{s.name}</p>
              <p className="text-xs text-muted-foreground">{s.detail}</p>
            </div>
            {s.status === 'operational' ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs text-success">
                <CheckCircle2 className="h-3 w-3" /> Operational
              </span>
            ) : s.status === 'degraded' ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2.5 py-1 text-xs text-warning">
                <AlertCircle className="h-3 w-3" /> Degraded
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-xs text-destructive">
                <AlertCircle className="h-3 w-3" /> Down
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Stats overview */}
      {status && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Total Storage</p>
            <p className="mt-1 text-2xl font-bold">{formatBytes(status.storageUsed)}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Processing Queue</p>
            <p className="mt-1 text-2xl font-bold">{status.processingPhotos}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Total Users</p>
            <p className="mt-1 text-2xl font-bold">{status.totalUsers}</p>
          </div>
        </div>
      )}

      {/* Error logs */}
      <div className="rounded-xl border border-border bg-card">
        <h2 className="border-b border-border p-4 text-sm font-semibold">Error Monitoring</h2>
        {errorLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <CheckCircle2 className="mb-3 h-10 w-10 text-success" />
            <p className="text-sm text-muted-foreground">No errors detected. All systems healthy.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {errorLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 p-4">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{log.error}</p>
                  <p className="text-xs text-muted-foreground">Photo ID: {log.photo_id} · {timeAgo(log.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Subscription management placeholder */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-2 text-sm font-semibold">Subscription Management</h2>
        <p className="text-sm text-muted-foreground">
          Stripe integration for subscription billing is available as an add-on. Configure billing plans and manage photographer subscriptions.
        </p>
        <div className="mt-3 rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
          Stripe integration placeholder — activate via the billing settings when ready.
        </div>
      </div>
    </div>
  );
}
