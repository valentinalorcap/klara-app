import { cn } from '@/lib/utils';
import type { ComponentProps } from 'react';

/** Translucent dark card — the building block of the Klara UI. */
export function GlassCard({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'rounded-3xl border border-white/10 bg-white/[0.06] backdrop-blur-xl',
        'shadow-[0_8px_32px_-12px_rgba(0,0,0,0.4)]',
        className,
      )}
      {...props}
    />
  );
}
