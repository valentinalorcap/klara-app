'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export type Segment<T extends string> = { value: T; label: string };

/**
 * Design-system segmented control: a rounded track with the selected segment
 * highlighted as a pill that **slides** horizontally to the new position.
 * Uses a single highlight whose x is driven by the active index (no shared
 * layoutId), so it can't clash with other layout animations on the page.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  const activeIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );

  return (
    <div className={cn('relative flex rounded-2xl bg-white/[0.04] p-1', className)}>
      {/* Sliding highlight — one pill, moved by whole slots via translateX. */}
      <motion.div
        aria-hidden
        className="absolute top-1 bottom-1 left-1 rounded-xl bg-[var(--accent)]/15"
        style={{ width: `calc((100% - 0.5rem) / ${options.length})` }}
        animate={{ x: `${activeIndex * 100}%` }}
        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
      />
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className={cn(
              'relative z-10 flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition-colors',
              active ? 'text-[var(--accent)]' : 'text-neutral-400',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
