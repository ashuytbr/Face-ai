import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/brand/logo';
import { ShieldOff } from 'lucide-react';

export default function SuspendedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <Logo size="lg" />
      <div className="mt-12 max-w-md rounded-2xl border border-border bg-card p-8 text-center">
        <ShieldOff className="mx-auto mb-4 h-12 w-12 text-destructive" />
        <h1 className="text-xl font-bold">Account suspended</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your PODDAR PIX account has been suspended. Please contact support if you believe this is an error.
        </p>
        <Link href="mailto:support@poddarpix.com" className="mt-6 inline-block">
          <Button variant="outline">Contact Support</Button>
        </Link>
      </div>
    </div>
  );
}
