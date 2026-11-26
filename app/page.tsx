import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/brand/logo';
import {
  Camera,
  Scan,
  Image as ImageIcon,
  Shield,
  Zap,
  QrCode,
  Globe,
  Check,
  ArrowRight,
  Sparkles,
  Lock,
  Server,
  Cpu,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Logo />
          <nav className="hidden items-center gap-8 md:flex">
            <Link href="/#features" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Features
            </Link>
            <Link href="/pricing" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Pricing
            </Link>
            <Link href="/login" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Sign in
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden sm:block">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">
                Get Started
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="absolute inset-0 bg-radial-fade" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary">
              <Sparkles className="h-4 w-4" />
              AI-Powered Face Recognition
            </div>
            <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              Every face.
              <br />
              Every moment.
              <br />
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Every memory.
              </span>
            </h1>
            <p className="mx-auto mt-8 max-w-2xl text-balance text-lg text-muted-foreground sm:text-xl">
              PODDAR PIX lets photographers upload thousands of event photos, and guests find
              their own pictures in seconds with just a selfie. No scrolling. No tagging. Just faces.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/signup">
                <Button size="lg" className="w-full sm:w-auto">
                  Start as a Photographer
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  <QrCode className="mr-2 h-4 w-4" />
                  Sign In
                </Button>
              </Link>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              No credit card required. Free tier available.
            </p>
          </div>

          {/* Floating mockup */}
          <div className="relative mt-20 mx-auto max-w-5xl">
            <div className="absolute -inset-x-20 -top-20 bottom-0 bg-gradient-to-b from-primary/20 to-transparent blur-3xl" />
            <div className="relative rounded-2xl border border-border bg-card/50 p-2 backdrop-blur-sm glow-primary">
              <div className="rounded-xl border border-border bg-background/80 p-6 sm:p-10">
                <div className="grid gap-6 sm:grid-cols-3">
                  {[
                    { icon: Camera, label: 'Photographer uploads event photos', color: 'text-primary' },
                    { icon: Scan, label: 'Guest uploads a selfie', color: 'text-chart-4' },
                    { icon: ImageIcon, label: 'Guest gets matched photos', color: 'text-success' },
                  ].map((step, i) => (
                    <div key={i} className="relative rounded-xl border border-border bg-card p-6">
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-secondary">
                        <step.icon className={`h-6 w-6 ${step.color}`} />
                      </div>
                      <div className="absolute right-4 top-4 text-sm font-bold text-muted-foreground/40">
                        0{i + 1}
                      </div>
                      <p className="text-sm font-medium text-foreground">{step.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-border/50 bg-card/30">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 text-center sm:grid-cols-4">
            {[
              { value: '10,000+', label: 'Photos indexed' },
              { value: '< 2s', label: 'Match time' },
              { value: '512-dim', label: 'Face embeddings' },
              { value: '99.2%', label: 'Match accuracy' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl font-bold text-primary sm:text-4xl">{stat.value}</div>
                <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything photographers need
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            From bulk upload to AI face indexing to guest delivery, PODDAR PIX handles the full pipeline.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Camera, title: 'Bulk Photo Upload', desc: 'Drag-and-drop thousands of photos. Duplicate detection, retry on failure, upload progress tracking.' },
            { icon: Cpu, title: 'AI Face Recognition', desc: 'InsightFace + ONNX Runtime detects faces and generates 512-dimensional embeddings for vector similarity search.' },
            { icon: Scan, title: 'Selfie Search', desc: 'Guests upload a selfie and get matched photos in seconds. No account needed, minimal friction.' },
            { icon: QrCode, title: 'QR Code Delivery', desc: 'Every event gets a unique URL and downloadable QR code. Guests scan and instantly access their photos.' },
            { icon: Shield, title: 'Privacy First', desc: 'Explicit consent before recognition. Selfies deleted after matching. No cross-event tracking. Event-scoped search.' },
            { icon: Server, title: 'Private Storage', desc: 'Originals stored in private buckets with signed URLs. Never publicly accessible. Watermark support.' },
          ].map((feature) => (
            <div
              key={feature.title}
              className="group rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:bg-card/80"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-border/50 bg-card/30">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">How it works</h2>
            <p className="mt-4 text-lg text-muted-foreground">A simple flow for photographers and guests alike.</p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-8">
              <div className="mb-6 inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                <Camera className="h-4 w-4" /> For Photographers
              </div>
              <ol className="space-y-4">
                {[
                  'Create an event with cover photo and details',
                  'Bulk upload event photos via drag-and-drop',
                  'AI automatically detects and indexes faces',
                  'Share the QR code or event link with guests',
                  'Track searches, downloads, and storage usage',
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      {i + 1}
                    </span>
                    <span className="text-sm text-muted-foreground">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-2xl border border-border bg-card p-8">
              <div className="mb-6 inline-flex items-center gap-2 rounded-lg bg-chart-4/10 px-3 py-1 text-sm font-medium text-chart-4">
                <Scan className="h-4 w-4" /> For Guests
              </div>
              <ol className="space-y-4">
                {[
                  'Scan the event QR code or open the link',
                  'Review how face matching works and give consent',
                  'Upload or capture a selfie',
                  'AI searches only within that event',
                  'View, download, and share matched photos',
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-chart-4 text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <span className="text-sm text-muted-foreground">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* Privacy section */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-4 py-1.5 text-sm text-success">
              <Lock className="h-4 w-4" /> Privacy & Security
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Biometric data, handled responsibly
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Face recognition involves sensitive biometric data. PODDAR PIX is built with privacy
              as a first principle, not an afterthought.
            </p>
            <ul className="mt-8 space-y-3">
              {[
                'Explicit guest consent before any recognition',
                'Selfie images deleted immediately after matching',
                'Event-scoped search — no cross-event tracking',
                'Private storage with signed URLs, never public',
                'Configurable face embedding deletion',
                'Event expiry and automatic deletion policies',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-success" />
                  <span className="text-sm text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative rounded-2xl border border-border bg-card p-8">
            <div className="absolute -inset-4 bg-gradient-to-br from-primary/10 to-transparent blur-2xl" />
            <div className="relative space-y-4">
              {[
                { icon: Shield, label: 'RLS Policies', desc: 'Row-level security on every table' },
                { icon: Lock, label: 'Signed URLs', desc: 'Private access to all originals' },
                { icon: Zap, label: 'Rate Limited', desc: 'Selfie search abuse prevention' },
                { icon: Globe, label: 'Event Isolation', desc: 'Each event has its own face index' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-4 rounded-xl border border-border bg-background/50 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="text-xs text-muted-foreground">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden border-t border-border">
        <div className="absolute inset-0 bg-radial-fade" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight sm:text-5xl">
            Ready to find every face?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Join photographers delivering photos to guests in seconds, not days.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/signup">
              <Button size="lg">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="outline" size="lg">
                View Pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <Logo size="sm" />
            <p className="text-sm text-muted-foreground">
              Every face. Every moment. Every memory.
            </p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link href="/#features" className="hover:text-foreground">Features</Link>
              <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
              <Link href="/login" className="hover:text-foreground">Sign in</Link>
            </div>
          </div>
          <div className="mt-8 border-t border-border/50 pt-8 text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} PODDAR PIX. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
