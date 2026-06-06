'use client';

import { useState, useTransition } from 'react';
import { Sparkles } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { MealForm, type FavoriteMeal, type MealInitialValues } from './MealForm';
import { type LibraryItem } from './IngredientPicker';
import { estimateMealAction } from '@/app/(app)/today/describe/actions';
import type { EstimationResponse } from '@/lib/freeTextEstimation';
import { cn } from '@/lib/utils';

const PLACEHOLDER =
  'e.g. 3 tacos al pastor, una cerveza, dos trozos de pastel de tres leches, y un puñado de papas.';

export function DescribeMealClient({
  items,
  favorites,
}: {
  items: LibraryItem[];
  favorites: FavoriteMeal[];
}) {
  const [description, setDescription] = useState('');
  const [estimate, setEstimate] = useState<EstimationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onEstimate() {
    setError(null);
    startTransition(async () => {
      const result = await estimateMealAction(description);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEstimate(result.data);
    });
  }

  function onStartOver() {
    setEstimate(null);
    setError(null);
  }

  if (estimate) {
    const initial: MealInitialValues = {
      type: estimate.suggestedType ?? 'OTHER',
      name: estimate.suggestedName ?? null,
      entries: estimate.entries.map((e) => ({
        name: e.name,
        grams: e.grams,
        productId: null,
        recipeId: null,
        kcalPer100g: e.kcalPer100g,
        proteinPer100g: e.proteinPer100g,
        carbsPer100g: e.carbsPer100g,
        fatPer100g: e.fatPer100g,
      })),
    };

    return (
      <div className="space-y-5">
        <GlassCard className="space-y-3 border-[var(--accent)]/20 bg-[var(--accent)]/[0.04] p-4">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-[var(--accent)]" />
            <p className="text-xs font-medium tracking-wider text-[var(--accent)] uppercase">
              Klara’s estimate
            </p>
          </div>
          <p className="text-xs text-neutral-300">
            Review the entries, tweak grams or names if something looks off, then save like any
            other meal.
          </p>
          <button
            type="button"
            onClick={onStartOver}
            className="text-xs font-medium text-[var(--accent)] underline-offset-4 hover:underline"
          >
            ← Start over with a new description
          </button>
        </GlassCard>

        <MealForm items={items} favorites={favorites} initial={initial} cancelHref="/today" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <GlassCard className="space-y-3 p-5">
        <label className="block">
          <span className="text-xs font-medium tracking-wider text-neutral-400 uppercase">
            Tell Klara what you ate
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            maxLength={800}
            placeholder={PLACEHOLDER}
            className="mt-2 block w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:bg-white/[0.08] focus:ring-2 focus:ring-[var(--accent)]/60 focus:outline-none"
          />
        </label>
        <p className="text-[11px] text-neutral-500">
          {description.length}/800 — be specific with counts and sizes when you can (“2 medium
          tacos”, “half a slice”).
        </p>
      </GlassCard>

      {error ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={onEstimate}
        disabled={pending || description.trim().length < 3}
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_var(--accent-glow)] transition active:scale-[0.98]',
          'bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50',
        )}
      >
        <Sparkles size={14} className={cn(pending && 'animate-pulse')} />
        {pending ? 'Klara is thinking…' : 'Ask Klara to estimate'}
      </button>
    </div>
  );
}
