'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

type GlassCardProps = HTMLMotionProps<'div'> & {
  /** Skip the entrance animation (e.g. for cards that mount inside a stagger). */
  noAnimate?: boolean;
};

/** Translucent dark card with a soft entrance — the Klara surface primitive. */
export function GlassCard({ className, noAnimate, children, ...props }: GlassCardProps) {
  return (
    <motion.div
      initial={noAnimate ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 180, damping: 22 }}
      className={cn(
        'rounded-3xl border border-white/10 bg-white/[0.06] backdrop-blur-xl',
        'shadow-[0_8px_32px_-12px_rgba(0,0,0,0.4)]',
        className,
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}
