'use client';

import { useTransition } from 'react';
import { CircleCheck, Circle } from 'lucide-react';
import { toggleProductInUse } from '@/app/(app)/products/actions';
import { cn } from '@/lib/utils';

/**
 * Quick "currently using" toggle shown over a product card. Sits as a
 * sibling of the card's edit link (not nested) and stops the click from
 * navigating, so tapping it only flips the flag.
 */
export function ProductInUseToggle({
  id,
  inUse,
  className,
}: {
  id: string;
  inUse: boolean;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        startTransition(() => toggleProductInUse(id));
      }}
      aria-pressed={inUse}
      aria-label={inUse ? 'Currently using — tap to unset' : 'Mark as currently using'}
      disabled={pending}
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full border text-[11px] font-medium transition active:scale-95 disabled:opacity-50',
        inUse
          ? 'border-[var(--accent)]/40 bg-[var(--accent)]/15 px-2.5 py-1 text-[var(--accent)]'
          : 'border-white/10 bg-white/[0.04] p-1.5 text-neutral-400 hover:bg-white/[0.08]',
        className,
      )}
    >
      {inUse ? <CircleCheck size={13} /> : <Circle size={13} />}
      {inUse ? 'In use' : null}
    </button>
  );
}
