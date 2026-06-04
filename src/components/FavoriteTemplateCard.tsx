'use client';

import { useTransition, type MouseEvent } from 'react';
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
    <GlassCard className="p-5">
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
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-yellow-400 transition disabled:opacity-30',
          )}
        >
          <Star size={16} fill="currentColor" />
        </button>
      </div>

      <p className="mt-3 text-2xl font-bold whitespace-nowrap text-white tabular-nums">
        {totals.protein.toFixed(1)}
        <span className="text-sm font-medium text-neutral-400">g P</span>
        <span className="mx-2 text-neutral-500">·</span>
        {Math.round(totals.kcal)}
        <span className="text-sm font-medium text-neutral-400"> kcal</span>
      </p>
      <p className="mt-1 text-xs text-neutral-400 tabular-nums">
        C {totals.carbs.toFixed(1)}g · F {totals.fat.toFixed(1)}g
      </p>

      <ul className="mt-4 space-y-1.5">
        {template.entries.map((e) => {
          const m = entryMacros(e);
          return (
            <li
              key={e.id}
              className="flex items-baseline justify-between gap-3 text-xs text-neutral-400 tabular-nums"
            >
              <span className="min-w-0 flex-1 truncate text-neutral-300">{e.name}</span>
              <span className="shrink-0 text-neutral-500">
                {e.grams.toFixed(0)}g · {Math.round(m.kcal)} kcal · {m.protein.toFixed(1)}g P
              </span>
            </li>
          );
        })}
      </ul>
    </GlassCard>
  );
}
