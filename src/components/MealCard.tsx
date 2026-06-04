'use client';

import { useTransition } from 'react';
import { Star, Trash2 } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { toggleFavorite, deleteMeal } from '@/app/(app)/today/actions';
import { MEAL_TYPE_LABELS, type MealType, entryMacros, sumEntries } from '@/lib/meals';
import { cn } from '@/lib/utils';

export type MealCardEntry = {
  id: string;
  name: string;
  grams: number;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
};

export function MealCard({
  meal,
}: {
  meal: {
    id: string;
    type: MealType;
    name: string | null;
    isFavorite: boolean;
    entries: MealCardEntry[];
  };
}) {
  const [pendingStar, startStar] = useTransition();
  const [pendingDelete, startDelete] = useTransition();
  const totals = sumEntries(meal.entries);

  function onStar() {
    startStar(async () => {
      await toggleFavorite(meal.id);
    });
  }

  function onDelete() {
    const label = meal.name ?? MEAL_TYPE_LABELS[meal.type];
    if (!confirm(`Delete "${label}"?`)) return;
    startDelete(async () => {
      await deleteMeal(meal.id);
    });
  }

  return (
    <GlassCard className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium tracking-wider text-[var(--accent)] uppercase">
            {MEAL_TYPE_LABELS[meal.type]}
          </p>
          {meal.name ? (
            <h3 className="mt-0.5 truncate text-sm font-semibold text-white">{meal.name}</h3>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <IconButton
            label={meal.isFavorite ? 'Unstar' : 'Star'}
            onClick={onStar}
            disabled={pendingStar}
            className={
              meal.isFavorite ? 'text-yellow-400' : 'text-neutral-400 hover:text-yellow-400'
            }
          >
            <Star size={16} fill={meal.isFavorite ? 'currentColor' : 'transparent'} />
          </IconButton>
          <IconButton
            label="Delete"
            onClick={onDelete}
            disabled={pendingDelete}
            className="text-neutral-400 hover:text-[var(--danger)]"
          >
            <Trash2 size={16} />
          </IconButton>
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-3">
        <p className="text-2xl font-bold text-white tabular-nums">
          {Math.round(totals.kcal)}
          <span className="ml-1 text-xs font-medium text-neutral-400">kcal</span>
        </p>
        <p className="text-xs text-neutral-400 tabular-nums">
          P {totals.protein.toFixed(1)}g · C {totals.carbs.toFixed(1)}g · F {totals.fat.toFixed(1)}g
        </p>
      </div>

      <ul className="mt-4 space-y-1.5">
        {meal.entries.map((e) => {
          const m = entryMacros(e);
          return (
            <li
              key={e.id}
              className="flex items-baseline justify-between gap-3 text-xs text-neutral-400 tabular-nums"
            >
              <span className="min-w-0 flex-1 truncate text-neutral-300">{e.name}</span>
              <span className="shrink-0 text-neutral-500">
                {e.grams.toFixed(0)}g · {Math.round(m.kcal)} kcal
              </span>
            </li>
          );
        })}
      </ul>
    </GlassCard>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-full transition disabled:opacity-30',
        className,
      )}
    >
      {children}
    </button>
  );
}
