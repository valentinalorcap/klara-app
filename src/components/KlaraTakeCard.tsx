'use client';

import { useState, useTransition, type MouseEvent } from 'react';
import { Sparkles, RefreshCw, ChevronDown } from 'lucide-react';
import { EvalStatus, EvalTone } from '@prisma/client';
import { GlassCard } from './GlassCard';
import { retryEvaluation } from '@/app/(app)/today/actions';
import { TONE_LABELS } from '@/lib/evaluations';
import { cn } from '@/lib/utils';

export type KlaraTake = {
  mealId: string;
  status: EvalStatus;
  tone: EvalTone;
  markdown: string | null;
  errorMessage: string | null;
};

/**
 * Surfaces Klara's evaluation of the most recent meal logged today.
 * Collapsed by default — two-line preview with a chevron; tap expands
 * to the full text. PENDING and ERROR states stay compact (no toggle).
 */
export function KlaraTakeCard({ take }: { take: KlaraTake }) {
  const [expanded, setExpanded] = useState(false);
  const [pending, startRetry] = useTransition();

  function onRetry(e: MouseEvent) {
    e.stopPropagation();
    startRetry(async () => {
      await retryEvaluation(take.mealId);
    });
  }

  if (take.status === EvalStatus.PENDING) {
    return (
      <GlassCard className="border-[var(--accent)]/20 bg-[var(--accent)]/[0.04] p-4">
        <div className="flex items-center gap-2">
          <Sparkles size={13} className="animate-pulse text-[var(--accent)]" />
          <p className="text-xs font-medium text-[var(--accent)]">Klara is thinking…</p>
        </div>
        <div className="mt-2 space-y-1.5" aria-hidden>
          <div className="h-2 w-full animate-pulse rounded-full bg-white/10" />
          <div className="h-2 w-3/5 animate-pulse rounded-full bg-white/10" />
        </div>
      </GlassCard>
    );
  }

  if (take.status === EvalStatus.ERROR) {
    return (
      <GlassCard className="border-[var(--danger)]/20 bg-[var(--danger)]/[0.04] p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-[var(--danger)]">Couldn’t generate an evaluation.</p>
          <button
            type="button"
            onClick={onRetry}
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
    <GlassCard
      className="cursor-pointer border-[var(--accent)]/20 bg-[var(--accent)]/[0.04] p-4 transition hover:border-[var(--accent)]/35 active:scale-[0.995]"
      onClick={() => setExpanded((v) => !v)}
    >
      <div className="mb-1.5 flex items-center gap-2">
        <Sparkles size={13} className="text-[var(--accent)]" />
        <span className="text-[10px] font-medium tracking-wider text-[var(--accent)] uppercase">
          {TONE_LABELS[take.tone]} take
        </span>
        <ChevronDown
          size={14}
          className={cn(
            'ml-auto text-neutral-500 transition-transform duration-300',
            expanded ? 'rotate-180' : 'rotate-0',
          )}
          aria-hidden
        />
      </div>
      <p className={cn('text-xs leading-relaxed text-neutral-200', !expanded && 'line-clamp-2')}>
        {take.markdown}
      </p>
    </GlassCard>
  );
}
