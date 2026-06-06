'use client';

import { useState, useTransition, type MouseEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { removeFavorite } from '@/app/(app)/today/actions';
import { MEAL_TYPE_LABELS, type MealType, entryMacros, sumEntries } from '@/lib/meals';
import { cn } from '@/lib/utils';

export type FavoriteTemplateEntry = {
  id: string;
  name: string;
  grams: number;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
};

export function FavoriteTemplateCard({
  template,
}: {
  template: {
    id: string;
    type: MealType;
    name: string | null;
    entries: FavoriteTemplateEntry[];
  };
}) {
  const [expanded, setExpanded] = useState(false);
  const [pending, startTransition] = useTransition();
  const totals = sumEntries(template.entries);

  function onUnstar(e: MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    const label = template.name ?? MEAL_TYPE_LABELS[template.type];
    if (!confirm(`Remove "${label}" from favorites?`)) return;
    startTransition(async () => {
      await removeFavorite(template.id);
    });
  }

  return (
    <GlassCard
      className={cn(
        'cursor-pointer p-5 transition active:scale-[0.995]',
        expanded
          ? 'border-white/15'
          : 'border-white/10 shadow-[0_1px_0_rgba(255,255,255,0.06)_inset,0_8px_32px_-12px_rgba(0,0,0,0.4)] hover:border-white/20',
      )}
      onClick={() => setExpanded((v) => !v)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium tracking-wider text-[var(--accent)] uppercase">
            {MEAL_TYPE_LABELS[template.type]}
          </p>
          {template.name ? (
            <h3 className="mt-0.5 truncate text-sm font-semibold text-white">{template.name}</h3>
          ) : null}
        </div>
        <button
          type="button"
          aria-label="Remove from favorites"
          onClick={onUnstar}
          disabled={pending}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-yellow-400 transition disabled:opacity-30"
        >
          <Star size={16} fill="currentColor" />
        </button>
      </div>

      <p className="mt-3 text-2xl font-bold whitespace-nowrap text-white tabular-nums">
        <span className="text-sm font-medium text-neutral-400">P </span>
        {totals.protein.toFixed(1)}
        <span className="text-sm font-medium text-neutral-400">g</span>
        <span className="mx-2 text-neutral-500">·</span>
        {Math.round(totals.kcal)}
        <span className="text-sm font-medium text-neutral-400"> kcal</span>
      </p>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 28 }}
            className="overflow-hidden"
          >
            <p className="mt-1 text-xs text-neutral-400 tabular-nums">
              C {totals.carbs.toFixed(1)}g · F {totals.fat.toFixed(1)}g
            </p>
            <ul className="mt-4 border-t border-white/5 pt-2">
              {template.entries.map((e) => {
                const m = entryMacros(e);
                return (
                  <li
                    key={e.id}
                    className="flex items-baseline justify-between gap-3 pt-2 text-xs text-neutral-400"
                  >
                    <div className="flex min-w-0 flex-1 items-baseline gap-1.5">
                      <span className="min-w-0 truncate text-neutral-300">{e.name}</span>
                      <span className="shrink-0 text-neutral-500 tabular-nums">
                        {e.grams.toFixed(0)}g
                      </span>
                    </div>
                    <span className="shrink-0 text-neutral-500 tabular-nums">
                      P {m.protein.toFixed(1)}g · {Math.round(m.kcal)} kcal
                    </span>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="mt-4 flex justify-center" aria-hidden>
        <span
          className={cn(
            'h-[5px] w-12 rounded-full transition-colors',
            expanded ? 'bg-white/15' : 'bg-white/25',
          )}
        />
      </div>
    </GlassCard>
  );
}
