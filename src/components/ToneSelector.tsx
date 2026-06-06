'use client';

import { useState, useTransition } from 'react';
import { Check } from 'lucide-react';
import { EvalTone } from '@prisma/client';
import { GlassCard } from './GlassCard';
import { updateTone } from '@/app/(app)/settings/actions';
import { TONE_LABELS, TONE_DESCRIPTIONS } from '@/lib/evaluations';
import { cn } from '@/lib/utils';

const TONE_OPTIONS: EvalTone[] = [EvalTone.DIRECT, EvalTone.MOTIVATIONAL, EvalTone.NEUTRAL];

export function ToneSelector({ initial }: { initial: EvalTone }) {
  const [selected, setSelected] = useState<EvalTone>(initial);
  const [pending, startTransition] = useTransition();

  function onSelect(tone: EvalTone) {
    if (tone === selected || pending) return;
    setSelected(tone);
    startTransition(async () => {
      const result = await updateTone(tone);
      if (!result.ok) setSelected(initial);
    });
  }

  return (
    <GlassCard className="space-y-3 p-5">
      <div>
        <p className="text-xs font-medium tracking-wider text-neutral-400 uppercase">
          Klara’s tone
        </p>
        <p className="mt-1 text-[11px] text-neutral-500">
          How Klara writes her take after each meal.
        </p>
      </div>

      <div className="space-y-2">
        {TONE_OPTIONS.map((tone) => {
          const active = selected === tone;
          return (
            <button
              key={tone}
              type="button"
              onClick={() => onSelect(tone)}
              disabled={pending}
              aria-pressed={active}
              className={cn(
                'flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition active:scale-[0.99] disabled:opacity-60',
                active
                  ? 'border-[var(--accent)]/40 bg-[var(--accent)]/10'
                  : 'border-white/10 bg-white/[0.03] hover:border-white/20',
              )}
            >
              <span
                className={cn(
                  'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition',
                  active
                    ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                    : 'border-white/20',
                )}
                aria-hidden
              >
                {active ? <Check size={12} strokeWidth={3} /> : null}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-white">{TONE_LABELS[tone]}</span>
                <span className="mt-0.5 block text-xs text-neutral-400">
                  {TONE_DESCRIPTIONS[tone]}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </GlassCard>
  );
}
