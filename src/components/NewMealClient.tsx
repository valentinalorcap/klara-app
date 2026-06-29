'use client';

import { useState, useCallback, useRef, useTransition } from 'react';
import Link from 'next/link';
import { Star, Trash2 } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { MealForm, type MealFormPayload, type FavoriteMeal } from './MealForm';
import { type LibraryItem } from './IngredientPicker';
import { MEAL_TYPE_LABELS, sumEntries } from '@/lib/meals';
import { createMealBatch, suggestMealName } from '@/app/(app)/today/actions';
import { cn } from '@/lib/utils';

/** A meal staged into the batch, with its auto-naming state. */
type QueuedMeal = { key: string; payload: MealFormPayload; naming: boolean };

/**
 * Always-multi-meal "add meals" flow. You build one meal in the form; "Add
 * another meal" stages it and clears the form for the next; "Save all meals"
 * persists the staged meals plus whatever is currently in the form. Logging a
 * single meal stays one tap (just hit "Save all meals (1)").
 */
export function NewMealClient({
  items,
  favorites,
  targetDate,
}: {
  items: LibraryItem[];
  favorites: FavoriteMeal[];
  /** When set, the meals attach to this day (a navigated past/future day). */
  targetDate?: string;
}) {
  const returnTo = targetDate ? `/today?date=${targetDate}` : undefined;

  const [queue, setQueue] = useState<QueuedMeal[]>([]);
  const [current, setCurrent] = useState<MealFormPayload | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const keySeq = useRef(0);

  const onValidChange = useCallback((p: MealFormPayload | null) => setCurrent(p), []);

  // The form's in-progress meal counts toward the total — no need to "add" it.
  const count = queue.length + (current ? 1 : 0);

  function addAnother() {
    if (!current) {
      setError('Add at least one ingredient before adding another meal.');
      return;
    }
    const payload = current;
    const key = `q-${keySeq.current++}`;
    const hasName = Boolean(payload.name && payload.name.trim());

    setQueue((prev) => [...prev, { key, payload, naming: !hasName }]);
    setCurrent(null);
    setFormKey((k) => k + 1); // remount the form blank for the next meal
    setError(null);

    // Name a freshly-built meal right away (favorites already carry a name).
    if (!hasName) {
      suggestMealName(payload.entries.map((e) => ({ name: e.name, grams: e.grams })))
        .then(({ name }) =>
          setQueue((prev) =>
            prev.map((q) =>
              q.key === key
                ? { ...q, naming: false, payload: { ...q.payload, name: name || q.payload.name } }
                : q,
            ),
          ),
        )
        .catch(() =>
          setQueue((prev) => prev.map((q) => (q.key === key ? { ...q, naming: false } : q))),
        );
    }
  }

  function removeFromQueue(key: string) {
    setQueue((prev) => prev.filter((q) => q.key !== key));
  }

  function saveAll() {
    const meals = [...queue.map((q) => q.payload), ...(current ? [current] : [])];
    if (meals.length === 0) {
      setError('Add at least one ingredient with grams.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createMealBatch({ meals }, returnTo);
      if (result && !result.ok) setError(result.error);
    });
  }

  return (
    <div className="mt-6 space-y-5">
      {favorites.length > 0 ? (
        <button
          type="button"
          onClick={() => setFavoritesOpen(true)}
          className="flex w-full items-center justify-between gap-2 rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-4 py-3 text-left text-sm font-semibold text-white transition hover:border-[var(--accent)]/50 hover:bg-[var(--accent)]/15"
        >
          <span className="flex items-center gap-2">
            <Star size={15} className="text-yellow-400" fill="currentColor" />
            Start from a favorite
          </span>
          <span className="text-xs font-medium text-neutral-300">{favorites.length} saved</span>
        </button>
      ) : null}

      {queue.length > 0 ? (
        <GlassCard className="space-y-3 p-4">
          <p className="text-xs font-medium tracking-wider text-neutral-400 uppercase">
            Added · {queue.length} {queue.length === 1 ? 'meal' : 'meals'}
          </p>
          <ul className="space-y-2">
            {queue.map((q) => {
              const totals = sumEntries(q.payload.entries);
              return (
                <li
                  key={q.key}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3"
                >
                  <div className="min-w-0 flex-1">
                    {q.naming && !q.payload.name ? (
                      <span
                        className="block h-4 w-32 animate-pulse rounded bg-white/15"
                        aria-label="Naming…"
                      />
                    ) : (
                      <p className="truncate text-sm font-semibold text-white">
                        {q.payload.name ?? MEAL_TYPE_LABELS[q.payload.type]}
                      </p>
                    )}
                    <p className="mt-0.5 text-xs text-white tabular-nums">
                      {Math.round(totals.kcal)}
                      <span className="text-neutral-400"> kcal</span>
                      <span className="mx-1.5 text-neutral-500">·</span>
                      <span className="text-neutral-400">P </span>
                      {totals.protein.toFixed(0)}g<span className="mx-1.5 text-neutral-500">·</span>
                      <span className="text-neutral-400">C </span>
                      {totals.carbs.toFixed(0)}g<span className="mx-1.5 text-neutral-500">·</span>
                      <span className="text-neutral-400">F </span>
                      {totals.fat.toFixed(0)}g
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFromQueue(q.key)}
                    aria-label="Remove meal"
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
        key={formKey}
        items={items}
        favorites={favorites}
        hideFavoritesButton
        hideActions
        defaultDate={targetDate}
        onValidChange={onValidChange}
        controlledFavoritesOpen={favoritesOpen}
        onCloseFavorites={() => setFavoritesOpen(false)}
      />

      {error ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}

      <div className="space-y-2">
        <button
          type="button"
          onClick={saveAll}
          disabled={pending || count === 0}
          className={cn(
            'w-full rounded-2xl px-4 py-3.5 text-sm font-semibold text-white transition active:scale-[0.98]',
            count > 0
              ? 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50'
              : 'cursor-not-allowed bg-white/[0.05] text-neutral-500 shadow-none',
          )}
        >
          {pending ? 'Saving…' : `Save all meals (${count})`}
        </button>
        <button
          type="button"
          onClick={addAnother}
          disabled={!current || pending}
          className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-neutral-200 transition hover:bg-white/[0.08] disabled:opacity-40"
        >
          + Add another meal
        </button>
        <Link
          href={returnTo ?? '/today'}
          className="block w-full px-4 py-2 text-center text-sm font-medium text-neutral-500 transition hover:text-neutral-300"
        >
          Cancel
        </Link>
      </div>
    </div>
  );
}
