'use client';

import { useState, useTransition } from 'react';
import { Sparkles, RefreshCw, ChevronDown, Moon } from 'lucide-react';
import { EvalStatus, EvalTone } from '@prisma/client';
import { GlassCard } from './GlassCard';
import { finishDay } from '@/app/(app)/today/actions';
import { cn } from '@/lib/utils';

export type DayTake = {
  status: EvalStatus;
  tone: EvalTone;
  markdown: string | null;
  errorMessage: string | null;
} | null;

/**
 * "Finish day" control + Klara's holistic review of the closed day. When
 * there's no review yet it's a single button; once generated it shows the
 * review (expandable) with a "Re-evaluate day" action, and flags when the
 * day changed since the last review.
 */
export function FinishDayCard({
  dateKey,
  take,
  stale,
}: {
  dateKey: string;
  take: DayTake;
  stale: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const [pending, start] = useTransition();

  function run() {
    start(async () => {
      const result = await finishDay(dateKey);
      if (result && !result.ok) window.alert(result.error);
    });
  }

  if (!take) {
    return (
      <GlassCard className="p-4">
        <button
          type="button"
          onClick={run}
          disabled={pending}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-4 py-3 text-sm font-semibold text-[var(--accent)] transition hover:bg-[var(--accent)]/15 disabled:opacity-50"
        >
          <Moon size={15} />
          {pending ? 'Closing the day…' : 'Finish day'}
        </button>
      </GlassCard>
    );
  }

  if (take.status === EvalStatus.PENDING) {
    return (
      <GlassCard className="border-[var(--accent)]/20 bg-[var(--accent)]/[0.04] p-4">
        <div className="flex items-center gap-2">
          <Sparkles size={13} className="animate-pulse text-[var(--accent)]" />
          <p className="text-xs font-medium text-[var(--accent)]">Klara is reviewing your day…</p>
        </div>
        <div className="mt-2 space-y-1.5" aria-hidden>
          <div className="h-2 w-full animate-pulse rounded-full bg-white/10" />
          <div className="h-2 w-4/5 animate-pulse rounded-full bg-white/10" />
          <div className="h-2 w-3/5 animate-pulse rounded-full bg-white/10" />
        </div>
      </GlassCard>
    );
  }

  if (take.status === EvalStatus.ERROR) {
    return (
      <GlassCard className="border-[var(--danger)]/20 bg-[var(--danger)]/[0.04] p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-[var(--danger)]">Couldn’t review the day.</p>
          <button
            type="button"
            onClick={run}
            disabled={pending}
            className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 text-xs text-neutral-200 transition hover:border-white/25 disabled:opacity-30"
          >
            <RefreshCw size={11} className={cn(pending && 'animate-spin')} />
            Retry
          </button>
        </div>
      </GlassCard>
    );
  }

  // DONE
  return (
    <GlassCard className="border-[var(--accent)]/20 bg-[var(--accent)]/[0.04] p-4">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 text-left"
      >
        <Moon size={13} className="text-[var(--accent)]" />
        <span className="text-[10px] font-medium tracking-wider text-[var(--accent)] uppercase">
          Klara
        </span>
        <ChevronDown
          size={14}
          className={cn(
            'ml-auto text-neutral-500 transition-transform duration-300',
            expanded ? 'rotate-180' : 'rotate-0',
          )}
          aria-hidden
        />
      </button>
      <p
        className={cn(
          'mt-1.5 text-xs leading-relaxed whitespace-pre-line text-neutral-200',
          !expanded && 'line-clamp-4',
        )}
      >
        {take.markdown}
      </p>
      {stale ? (
        <p className="mt-2 text-[11px] text-amber-300/80">This day changed since the review.</p>
      ) : null}
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-[var(--accent)] transition hover:text-[var(--accent-hover)] disabled:opacity-40"
      >
        <RefreshCw size={11} className={cn(pending && 'animate-spin')} />
        {pending ? 'Re-evaluating…' : 'Re-evaluate day'}
      </button>
    </GlassCard>
  );
}
