'use client';

import { useTransition } from 'react';
import { Moon } from 'lucide-react';
import { finishDay } from '@/app/(app)/today/actions';
import { cn } from '@/lib/utils';

export function FinishDayButton({ dateKey, closed }: { dateKey: string; closed?: boolean }) {
  const [pending, start] = useTransition();

  function run() {
    if (closed) return;
    start(async () => {
      const result = await finishDay(dateKey);
      if (result && !result.ok) window.alert(result.error);
    });
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={pending || closed}
      className={cn(
        'flex flex-1 items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition',
        closed
          ? 'cursor-default border-white/10 bg-white/[0.04] text-neutral-500'
          : 'border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/15 disabled:opacity-50',
      )}
    >
      <Moon size={15} />
      {pending ? 'Closing…' : closed ? 'Day closed' : 'Finish day'}
    </button>
  );
}
