'use client';

import { useTransition } from 'react';
import { Moon } from 'lucide-react';
import { finishDay } from '@/app/(app)/today/actions';
import { cn } from '@/lib/utils';

export function FinishDayButton({ dateKey }: { dateKey: string }) {
  const [pending, start] = useTransition();

  function run() {
    start(async () => {
      const result = await finishDay(dateKey);
      if (result && !result.ok) window.alert(result.error);
    });
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={pending}
      className={cn(
        'flex flex-1 items-center justify-center gap-2 rounded-2xl border border-[var(--accent)]/30',
        'bg-[var(--accent)]/10 px-4 py-3.5 text-sm font-semibold text-[var(--accent)]',
        'transition hover:bg-[var(--accent)]/15 disabled:opacity-50',
      )}
    >
      <Moon size={15} />
      {pending ? 'Closing…' : 'Finish day'}
    </button>
  );
}
