'use client';

import { useId } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export type Segment<T extends string> = { value: T; label: string };

/**
 * Design-system segmented control: a rounded track with the selected segment
 * highlighted as a pill that **slides** to the new position when it changes
 * (animated via a shared `layoutId`). Reusable across views.
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
  // Unique per instance so multiple controls on a page animate independently.
  const layoutId = useId();

  return (
    <div className={cn('flex rounded-2xl bg-white/[0.04] p-1', className)}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className="relative flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition-colors"
          >
            {active ? (
              <motion.span
                layoutId={layoutId}
                aria-hidden
                className="absolute inset-0 rounded-xl bg-[var(--accent)]/15"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            ) : null}
            <span
              className={cn('relative z-10', active ? 'text-[var(--accent)]' : 'text-neutral-400')}
            >
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
