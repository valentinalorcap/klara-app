'use client';

import { useState, useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { MealForm, type MealFormPayload, type FavoriteMeal } from './MealForm';
import { type LibraryItem } from './IngredientPicker';
import { MEAL_TYPE_LABELS, sumEntries } from '@/lib/meals';
import { createMealBatch } from '@/app/(app)/today/actions';
import { cn } from '@/lib/utils';

export function MealBatchBuilder({
  items,
  favorites,
}: {
  items: LibraryItem[];
  favorites: FavoriteMeal[];
}) {
  const [queue, setQueue] = useState<MealFormPayload[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function addToQueue(payload: MealFormPayload) {
    setQueue((prev) => [...prev, payload]);
    setError(null);
  }

  function removeFromQueue(index: number) {
    setQueue((prev) => prev.filter((_, i) => i !== index));
  }

  function saveAll() {
    if (queue.length === 0) {
      setError('Add at least one meal to the batch.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createMealBatch({ meals: queue });
      if (result && !result.ok) setError(result.error);
    });
  }

  return (
    <div className="space-y-5">
      {queue.length > 0 ? (
        <GlassCard className="space-y-3 p-5">
          <p className="text-xs font-medium tracking-wider text-neutral-400 uppercase">
            Batch queue · {queue.length} {queue.length === 1 ? 'meal' : 'meals'}
          </p>
          <ul className="space-y-2">
            {queue.map((m, i) => {
              const totals = sumEntries(m.entries);
              return (
                <li
                  key={i}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">
                      {m.name ?? MEAL_TYPE_LABELS[m.type]}
                    </p>
                    <p className="text-xs text-neutral-400 tabular-nums">
                      P {totals.protein.toFixed(1)}g · {Math.round(totals.kcal)} kcal ·{' '}
                      {m.entries.length} {m.entries.length === 1 ? 'ingredient' : 'ingredients'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFromQueue(i)}
                    aria-label="Remove from batch"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-400 transition hover:text-[var(--danger)]"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        </GlassCard>
      ) : null}

      <MealForm
        items={items}
        favorites={favorites}
        onAddToBatch={addToQueue}
        submitLabel="Add to batch"
        cancelHref="/today"
      />

      {error ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={saveAll}
        disabled={pending || queue.length === 0}
        className={cn(
          'w-full rounded-2xl px-4 py-3.5 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_var(--accent-glow)] transition active:scale-[0.98]',
          queue.length > 0
            ? 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50'
            : 'cursor-not-allowed bg-white/[0.05] text-neutral-500 shadow-none',
        )}
      >
        {pending ? 'Saving batch…' : `Save all (${queue.length})`}
      </button>
    </div>
  );
}
