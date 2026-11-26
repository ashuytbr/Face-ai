import { cn } from '@/lib/utils';
import { Camera } from 'lucide-react';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function Logo({ className, showText = true, size = 'md' }: LogoProps) {
  const iconSize = size === 'sm' ? 'h-7 w-7' : size === 'lg' ? 'h-10 w-10' : 'h-8 w-8';
  const textSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-lg';
  const padding = size === 'sm' ? 'p-1.5' : size === 'lg' ? 'p-2' : 'p-1.5';

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div
        className={cn(
          'relative flex items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 glow-sm',
          iconSize,
          padding
        )}
      >
        <Camera className="h-1/2 w-1/2 text-white" strokeWidth={2.5} />
      </div>
      {showText && (
        <span className={cn('font-bold tracking-tight text-foreground', textSize)}>
          PODDAR <span className="text-primary">PIX</span>
        </span>
      )}
    </div>
  );
}
