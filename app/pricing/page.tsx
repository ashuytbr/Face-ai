import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/brand/logo';
import { Check, ArrowRight, Camera, Users, Server, Zap } from 'lucide-react';

const plans = [
  {
    name: 'Starter',
    price: 'Free',
    period: '',
    description: 'Perfect for trying out PODDAR PIX',
    features: [
      'Up to 2 events',
      '500 photos per event',
      '2 GB storage',
      'AI face indexing',
      'QR code generation',
      'Guest selfie search',
      'Watermark support',
    ],
    cta: 'Get Started',
    href: '/signup',
    highlighted: false,
  },
  {
    name: 'Professional',
    price: '$49',
    period: '/month',
    description: 'For working photographers and studios',
    features: [
      'Unlimited events',
      '5,000 photos per event',
      '50 GB storage',
      'Priority face indexing',
      'Custom event URLs',
      'Download analytics',
      'No watermark on downloads',
      'Email support',
    ],
    cta: 'Start Pro Trial',
    href: '/signup',
    highlighted: true,
  },
  {
    name: 'Studio',
    price: '$149',
    period: '/month',
    description: 'For large studios and event companies',
    features: [
      'Unlimited events',
      'Unlimited photos',
      '500 GB storage',
      'Fastest face indexing',
      'Team collaboration',
      'Event manager roles',
      'API access',
      'Priority support',
      'Custom branding',
    ],
    cta: 'Contact Sales',
    href: '/signup',
    highlighted: false,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/"><Logo /></Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">Sign in</Link>
            <Link href="/signup"><Button size="sm">Get Started</Button></Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Simple, transparent pricing</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Start free. Upgrade when your events grow. No hidden fees.
          </p>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-8 ${
                plan.highlighted
                  ? 'border-primary bg-card glow-primary'
                  : 'border-border bg-card'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-medium text-primary-foreground">
                  Most Popular
                </div>
              )}
              <h3 className="text-xl font-bold">{plan.name}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground">{plan.period}</span>
              </div>
              <Link href={plan.href} className="mt-6 block">
                <Button className="w-full" variant={plan.highlighted ? 'default' : 'outline'}>
                  {plan.cta}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <ul className="mt-8 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-success" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Feature comparison */}
        <div className="mt-24 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Camera, title: 'Unlimited Events', desc: 'Create as many events as you need on paid plans' },
            { icon: Zap, title: 'Fast Indexing', desc: 'AI face detection runs in the background on every upload' },
            { icon: Users, title: 'Guest Friendly', desc: 'No account needed for guests — just scan and search' },
            { icon: Server, title: 'Private Storage', desc: 'All originals in private buckets with signed URLs' },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-border bg-card p-6">
              <item.icon className="mb-3 h-8 w-8 text-primary" />
              <h3 className="font-semibold">{item.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 py-8 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} PODDAR PIX. Every face. Every moment. Every memory.
        </div>
      </footer>
    </div>
  );
}
