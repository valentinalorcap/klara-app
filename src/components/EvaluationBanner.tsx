'use client';

import { useTransition, type MouseEvent } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { EvalStatus, EvalTone } from '@prisma/client';
import { retryEvaluation } from '@/app/(app)/today/actions';
import { TONE_LABELS } from '@/lib/evaluations';
import { cn } from '@/lib/utils';

export type EvaluationView = {
  status: EvalStatus;
  tone: EvalTone;
  markdown: string | null;
  errorMessage: string | null;
};

export function EvaluationBanner({
  mealId,
  evaluation,
}: {
  mealId: string;
  evaluation: EvaluationView;
}) {
  const [pending, startTransition] = useTransition();

  function onRetry(e: MouseEvent) {
    e.stopPropagation();
    startTransition(async () => {
      await retryEvaluation(mealId);
    });
  }

  if (evaluation.status === EvalStatus.PENDING) {
    return (
      <div className="mt-4 rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent)]/5 p-3">
        <div className="flex items-center gap-2">
          <Sparkles size={13} className="animate-pulse text-[var(--accent)]" />
          <p className="text-xs font-medium text-[var(--accent)]">Klara is thinking…</p>
        </div>
        <div className="mt-2 space-y-1.5" aria-hidden>
          <div className="h-2 w-full animate-pulse rounded-full bg-white/10" />
          <div className="h-2 w-4/5 animate-pulse rounded-full bg-white/10" />
        </div>
      </div>
    );
  }

  if (evaluation.status === EvalStatus.ERROR) {
    return (
      <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger)]/5 p-3">
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
    );
  }

  // DONE
  return (
    <div className="mt-4 rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent)]/5 p-3">
      <div className="mb-1.5 flex items-center gap-2">
        <Sparkles size={13} className="text-[var(--accent)]" />
        <span className="text-[10px] font-medium tracking-wider text-[var(--accent)] uppercase">
          {TONE_LABELS[evaluation.tone]} take
        </span>
      </div>
      <p className="text-xs leading-relaxed text-neutral-200">{evaluation.markdown}</p>
    </div>
  );
}
