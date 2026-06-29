'use client';

import { useState, useTransition } from 'react';
import { Sparkles } from 'lucide-react';
import { estimateMealAction } from '@/app/(app)/today/actions';
import type { EstimationEntry } from '@/lib/freeTextEstimation';
import { cn } from '@/lib/utils';

/**
 * Free-text meal entry: describe what you ate and let Klara estimate it.
 * Klara matches your own products/recipes when she recognizes them, so
 * "yogurt" pulls in your yogurt's macros.
 */
export function DescribeMeal({
  onAddEstimate,
  onError,
  label = 'Describe your meal',
  placeholder = 'e.g. yogurt with berries and granola',
  hideLabel = false,
}: {
  onAddEstimate: (entries: EstimationEntry[]) => void;
  onError: (message: string) => void;
  /** Section label — override for non-meal contexts (e.g. recipe ingredients). */
  label?: string;
  placeholder?: string;
  /** Hide the label (e.g. when a tab already names the section). */
  hideLabel?: boolean;
}) {
  const [value, setValue] = useState('');
  const [estimating, startEstimate] = useTransition();
  const trimmed = value.trim();

  function askKlara() {
    if (trimmed.length < 3 || estimating) return;
    onError('');
    startEstimate(async () => {
      const result = await estimateMealAction(trimmed);
      if (!result.ok) {
        onError(result.error);
        return;
      }
      onAddEstimate(result.data.entries);
      setValue('');
    });
  }

  return (
    <div className="space-y-2.5">
      {hideLabel ? null : (
        <p className="text-xs font-medium tracking-wider text-neutral-400 uppercase">{label}</p>
      )}
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        rows={2}
        maxLength={800}
        disabled={estimating}
        className="block w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:bg-white/[0.08] focus:ring-2 focus:ring-[var(--accent)]/60 focus:outline-none disabled:opacity-50"
      />
      <button
        type="button"
        onClick={askKlara}
        disabled={trimmed.length < 3 || estimating}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-4 py-2.5 text-sm font-semibold text-[var(--accent-text)] transition hover:bg-[var(--accent)]/15 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Sparkles size={14} className={cn(estimating && 'animate-pulse')} />
        {estimating ? 'Klara is thinking…' : 'Ask Klara'}
      </button>
    </div>
  );
}
