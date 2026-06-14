'use client';

import { useTransition } from 'react';
import { Copy } from 'lucide-react';
import { copyDayToToday } from '@/app/(app)/today/actions';

/**
 * Icon-only "copy this day to today" — sits next to the settings gear,
 * shown on past days. Confirms, then replaces today's meals with this
 * day's; the action redirects to /today.
 */
export function CopyDayButton({ dateKey }: { dateKey: string }) {
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (
      !window.confirm(
        "Are you sure you want to copy this day? This will remove everything logged today and replace it with this day's meals.",
      )
    )
      return;
    startTransition(async () => {
      const result = await copyDayToToday(dateKey);
      if (result && !result.ok) window.alert(result.error);
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-label="Copy this day to today"
      title="Copy this day to today"
      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-neutral-300 backdrop-blur-xl transition hover:bg-white/10 disabled:opacity-50"
    >
      <Copy size={16} />
    </button>
  );
}
