'use client';

import { useEffect, useState } from 'react';
import type QRCodeModule from 'qrcode';
import { Event } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Download, Copy, QrCode, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export function EventQR({ event }: { event: Event }) {
  const { toast } = useToast();
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  const eventUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/e/${event.slug}`;

  useEffect(() => {
    let active = true;
    import('qrcode').then((mod: typeof QRCodeModule) => {
      if (!active) return;
      mod.toDataURL(eventUrl, {
        width: 400,
        margin: 2,
        color: { dark: '#0B0B0F', light: '#FFFFFF' },
        errorCorrectionLevel: 'M',
      }).then((url) => { if (active) setDataUrl(url); }).catch(() => {});
    });
    return () => { active = false; };
  }, [eventUrl]);

  const downloadQR = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `poddarpix-${event.slug}-qr.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(eventUrl);
    toast({ title: 'Link copied!', description: 'Share it with your guests.' });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
          <QrCode className="h-4 w-4" /> Guest Access
        </div>
        <h2 className="text-xl font-bold">Event QR Code</h2>
        <p className="mt-1 text-sm text-muted-foreground">Guests scan this to find their photos with a selfie.</p>

        <div className="mt-6 inline-block rounded-2xl border border-border bg-white p-4">
          {dataUrl ? (
            <img src={dataUrl} alt="QR Code" width={300} height={300} className="rounded-lg" />
          ) : (
            <div className="flex h-[300px] w-[300px] items-center justify-center text-muted-foreground">Generating...</div>
          )}
        </div>

        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button onClick={downloadQR} disabled={!dataUrl}>
            <Download className="mr-2 h-4 w-4" /> Download QR
          </Button>
          <Button variant="outline" onClick={copyLink}>
            <Copy className="mr-2 h-4 w-4" /> Copy Link
          </Button>
          <Link href={`/e/${event.slug}`} target="_blank">
            <Button variant="outline">
              <ExternalLink className="mr-2 h-4 w-4" /> Preview Guest Page
            </Button>
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-3 text-sm font-semibold">Event Link</h3>
        <Input readOnly value={eventUrl} className="font-mono text-sm" />
        <p className="mt-2 text-xs text-muted-foreground">
          This link opens the guest-facing event page directly. No account needed for guests.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-3 text-sm font-semibold">Sharing Tips</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>Print the QR code on table cards or a welcome sign at the event entrance.</li>
          <li>Share the link in event group chats or wedding websites.</li>
          <li>Guests just scan, upload a selfie, and get their matched photos instantly.</li>
        </ul>
      </div>
    </div>
  );
}
