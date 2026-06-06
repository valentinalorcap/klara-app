'use client';

import { useState, useMemo, useTransition } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Star, Sparkles } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { IngredientPicker, type LibraryItem } from './IngredientPicker';
import {
  MEAL_TYPE_OPTIONS,
  MEAL_TYPE_LABELS,
  type MealType,
  sumEntries,
  isoDate,
} from '@/lib/meals';
import { createMeal, updateMeal, estimateMealAction } from '@/app/(app)/today/actions';
import { cn } from '@/lib/utils';

type IngredientRow = {
  name: string;
  grams: string;
  resolved: boolean;
  productId?: string;
  recipeId?: string;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
};

function emptyRow(): IngredientRow {
  return {
    name: '',
    grams: '',
    resolved: false,
    kcalPer100g: 0,
    proteinPer100g: 0,
    carbsPer100g: 0,
    fatPer100g: 0,
  };
}

/** Each item in the recipe option also carries a default grams for one portion. */
type RecipeWithDefaultGrams = LibraryItem & { kind: 'recipe'; defaultGrams: number };

export type FavoriteMeal = {
  id: string;
  type: MealType;
  name: string | null;
  entries: {
    name: string;
    grams: number;
    productId: string | null;
    recipeId: string | null;
    kcalPer100g: number;
    proteinPer100g: number;
    carbsPer100g: number;
    fatPer100g: number;
  }[];
};

export type MealInitialValues = {
  /**
   * When present the form is in **edit** mode and saves via updateMeal.
   * When absent the form is in **create** mode seeded with these values —
   * used by the describe-in-text flow to preload the AI estimate.
   */
  mealId?: string;
  type: MealType;
  name: string | null;
  entries: {
    name: string;
    grams: number;
    productId: string | null;
    recipeId: string | null;
    kcalPer100g: number;
    proteinPer100g: number;
    carbsPer100g: number;
    fatPer100g: number;
  }[];
};

export type MealFormPayload = {
  date: string;
  type: MealType;
  name?: string;
  entries: {
    name: string;
    grams: number;
    productId?: string;
    recipeId?: string;
    kcalPer100g: number;
    proteinPer100g: number;
    carbsPer100g: number;
    fatPer100g: number;
  }[];
};

export function MealForm({
  items,
  favorites,
  initial,
  returnTo,
  onAddToBatch,
  submitLabel,
  cancelHref,
}: {
  items: LibraryItem[];
  favorites: FavoriteMeal[];
  initial?: MealInitialValues;
  /** Where the form should redirect after a successful save (edit mode only). */
  returnTo?: string;
  /**
   * When set, the submit button stages this meal into a local batch
   * instead of calling createMeal — used by /today/batch. The form
   * clears itself after each successful add.
   */
  onAddToBatch?: (payload: MealFormPayload) => void;
  /** Custom submit label override (defaults to "Save meal" / "Save changes"). */
  submitLabel?: string;
  /** Where the cancel link should go (default /today). */
  cancelHref?: string;
}) {
  const editMode = Boolean(initial?.mealId);
  const batchMode = Boolean(onAddToBatch);
  const [type, setType] = useState<MealType>(initial?.type ?? 'BREAKFAST');
  const [name, setName] = useState(initial?.name ?? '');
  const [rows, setRows] = useState<IngredientRow[]>(
    initial?.entries.length
      ? initial.entries.map((e) => ({
          name: e.name,
          grams: String(e.grams),
          resolved: true,
          productId: e.productId ?? undefined,
          recipeId: e.recipeId ?? undefined,
          kcalPer100g: e.kcalPer100g,
          proteinPer100g: e.proteinPer100g,
          carbsPer100g: e.carbsPer100g,
          fatPer100g: e.fatPer100g,
        }))
      : [emptyRow()],
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [description, setDescription] = useState('');
  const [estimating, startEstimate] = useTransition();

  const totals = useMemo(
    () =>
      sumEntries(
        rows
          .filter((r) => r.resolved && Number(r.grams) > 0)
          .map((r) => ({
            grams: Number(r.grams),
            kcalPer100g: r.kcalPer100g,
            proteinPer100g: r.proteinPer100g,
            carbsPer100g: r.carbsPer100g,
            fatPer100g: r.fatPer100g,
          })),
      ),
    [rows],
  );

  function updateRow(index: number, patch: Partial<IngredientRow>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }
  function removeRow(index: number) {
    setRows((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }

  function importFavorite(fav: FavoriteMeal) {
    setType(fav.type);
    if (fav.name) setName(fav.name);
    setRows(
      fav.entries.map((e) => ({
        name: e.name,
        grams: String(e.grams),
        resolved: true,
        productId: e.productId ?? undefined,
        recipeId: e.recipeId ?? undefined,
        kcalPer100g: e.kcalPer100g,
        proteinPer100g: e.proteinPer100g,
        carbsPer100g: e.carbsPer100g,
        fatPer100g: e.fatPer100g,
      })),
    );
  }

  function appendEstimatedEntries() {
    if (description.trim().length < 3) return;
    setError(null);
    startEstimate(async () => {
      const result = await estimateMealAction(description);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const newRows: IngredientRow[] = result.data.entries.map((e) => ({
        name: e.name,
        grams: String(Math.round(e.grams)),
        resolved: true,
        kcalPer100g: e.kcalPer100g,
        proteinPer100g: e.proteinPer100g,
        carbsPer100g: e.carbsPer100g,
        fatPer100g: e.fatPer100g,
      }));
      // Drop the leading empty placeholder row, if any, so the estimate
      // doesn't have a blank row above it.
      setRows((prev) => {
        const trimmed = prev.filter((r) => r.resolved || r.name.trim() || r.grams.trim());
        return [...trimmed, ...newRows];
      });
      if (result.data.suggestedType && !initial?.type) {
        setType(result.data.suggestedType);
      }
      if (result.data.suggestedName && !name.trim()) {
        setName(result.data.suggestedName);
      }
      setDescription('');
    });
  }

  function resetForm() {
    setType('BREAKFAST');
    setName('');
    setRows([emptyRow()]);
    setError(null);
  }

  function handleSubmit() {
    setError(null);
    const entries = rows
      .filter((r) => r.resolved && r.name.trim() && Number(r.grams) > 0)
      .map((r) => ({
        name: r.name.trim(),
        grams: Number(r.grams),
        productId: r.productId,
        recipeId: r.recipeId,
        kcalPer100g: r.kcalPer100g,
        proteinPer100g: r.proteinPer100g,
        carbsPer100g: r.carbsPer100g,
        fatPer100g: r.fatPer100g,
      }));
    if (entries.length === 0) {
      setError('Add at least one ingredient with grams.');
      return;
    }
    const payload: MealFormPayload = {
      date: isoDate(new Date()),
      type,
      name: name.trim() || undefined,
      entries,
    };

    if (onAddToBatch) {
      onAddToBatch(payload);
      resetForm();
      return;
    }

    startTransition(async () => {
      const result =
        editMode && initial?.mealId
          ? await updateMeal(initial.mealId, payload, returnTo)
          : await createMeal(payload);
      // On success the action redirects to /today; we only get here on error.
      if (result && !result.ok) setError(result.error);
    });
  }

  return (
    <div className="space-y-5">
      <GlassCard className="space-y-3 p-5">
        <p className="text-xs font-medium tracking-wider text-neutral-400 uppercase">Type</p>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {MEAL_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setType(opt.value)}
              className={cn(
                'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition',
                type === opt.value
                  ? 'border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)]'
                  : 'border-white/10 bg-white/[0.04] text-neutral-300 hover:bg-white/[0.08]',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <label className="block">
          <span className="text-xs text-neutral-400">Name (optional)</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={MEAL_TYPE_LABELS[type]}
            className="mt-1 block w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:bg-white/[0.08] focus:ring-2 focus:ring-[var(--accent)]/60 focus:outline-none"
          />
        </label>
      </GlassCard>

      {favorites.length > 0 ? (
        <GlassCard className="space-y-3 p-5">
          <p className="text-xs font-medium tracking-wider text-neutral-400 uppercase">
            Import from favorites
          </p>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {favorites.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => importFavorite(f)}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-yellow-400/30 bg-yellow-400/5 px-3 py-1.5 text-xs font-medium text-yellow-200 transition hover:bg-yellow-400/10"
              >
                <Star size={12} fill="currentColor" />
                {f.name ?? MEAL_TYPE_LABELS[f.type]}
              </button>
            ))}
          </div>
        </GlassCard>
      ) : null}

      <GlassCard className="space-y-3 p-5">
        <label className="block">
          <span className="text-xs font-medium tracking-wider text-neutral-400 uppercase">
            Describe to estimate
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={800}
            placeholder="e.g. 3 tacos al pastor, una cerveza y dos trozos de pastel"
            className="mt-2 block w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:bg-white/[0.08] focus:ring-2 focus:ring-[var(--accent)]/60 focus:outline-none"
          />
        </label>
        <button
          type="button"
          onClick={appendEstimatedEntries}
          disabled={estimating || description.trim().length < 3}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-3 py-2.5 text-xs font-medium text-[var(--accent)] transition hover:bg-[var(--accent)]/15 disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          <Sparkles size={12} className={cn(estimating && 'animate-pulse')} />
          {estimating ? 'Klara is thinking…' : 'Ask Klara to add these'}
        </button>
      </GlassCard>

      <GlassCard className="relative z-10 space-y-3 p-5">
        {rows.map((row, i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-end gap-1.5">
              <div className="min-w-0 flex-1">
                <IngredientPicker
                  value={row.name}
                  items={items}
                  onNameChange={(value) =>
                    updateRow(i, {
                      name: value,
                      resolved: row.resolved && row.name === value,
                    })
                  }
                  onSelectItem={(item) => {
                    if (item.kind === 'product') {
                      updateRow(i, {
                        name: item.name,
                        productId: item.id,
                        recipeId: undefined,
                        resolved: true,
                        kcalPer100g: item.kcalPer100g,
                        proteinPer100g: item.proteinPer100g,
                        carbsPer100g: item.carbsPer100g,
                        fatPer100g: item.fatPer100g,
                      });
                    } else {
                      // Recipe — auto-fill grams from its default portion size
                      // when the user hasn't typed anything yet.
                      const recipeWithGrams = item as RecipeWithDefaultGrams;
                      const seedGrams =
                        row.grams.trim() === '' && recipeWithGrams.defaultGrams
                          ? String(Math.round(recipeWithGrams.defaultGrams))
                          : row.grams;
                      updateRow(i, {
                        name: item.name,
                        productId: undefined,
                        recipeId: item.id,
                        resolved: true,
                        kcalPer100g: item.kcalPer100g,
                        proteinPer100g: item.proteinPer100g,
                        carbsPer100g: item.carbsPer100g,
                        fatPer100g: item.fatPer100g,
                        grams: seedGrams,
                      });
                    }
                  }}
                  onAiResolved={(data) =>
                    updateRow(i, {
                      name: data.canonicalName,
                      productId: undefined,
                      recipeId: undefined,
                      resolved: true,
                      kcalPer100g: data.kcalPer100g,
                      proteinPer100g: data.proteinPer100g,
                      carbsPer100g: data.carbsPer100g,
                      fatPer100g: data.fatPer100g,
                      grams:
                        data.estimatedGrams && row.grams.trim() === ''
                          ? String(data.estimatedGrams)
                          : row.grams,
                    })
                  }
                  onError={(msg) => setError(msg)}
                />
              </div>
              <input
                type="number"
                inputMode="decimal"
                value={row.grams}
                onChange={(e) => updateRow(i, { grams: e.target.value })}
                placeholder="100g"
                aria-label="Grams"
                className="w-16 shrink-0 rounded-2xl border border-white/10 bg-white/[0.04] px-2 py-2.5 text-center text-sm text-white tabular-nums placeholder:text-neutral-500 focus:bg-white/[0.08] focus:ring-2 focus:ring-[var(--accent)]/60 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => removeRow(i)}
                aria-label="Remove ingredient"
                disabled={rows.length === 1}
                className="-mr-2 flex h-10 w-8 shrink-0 items-center justify-center text-neutral-400 transition hover:text-[var(--danger)] disabled:opacity-30"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addRow}
          className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-white/15 px-4 py-3 text-xs font-medium text-[var(--accent)] transition hover:border-[var(--accent)]/60 hover:bg-[var(--accent)]/5"
        >
          <Plus size={14} /> Add ingredient
        </button>
      </GlassCard>

      <GlassCard className="space-y-3 p-5">
        <p className="text-xs font-medium tracking-wider text-neutral-400 uppercase">
          Total (live)
        </p>
        <div className="grid grid-cols-4 gap-3 text-center">
          <Stat label="kcal" value={Math.round(totals.kcal)} />
          <Stat label="P" value={totals.protein.toFixed(1) + 'g'} />
          <Stat label="C" value={totals.carbs.toFixed(1) + 'g'} />
          <Stat label="F" value={totals.fat.toFixed(1) + 'g'} />
        </div>
      </GlassCard>

      {error ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}

      <div className="space-y-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={pending}
          className="w-full rounded-2xl bg-[var(--accent)] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_var(--accent-glow)] transition hover:bg-[var(--accent-hover)] active:scale-[0.98] disabled:opacity-50"
        >
          {pending
            ? 'Saving…'
            : (submitLabel ??
              (batchMode ? 'Add to batch' : editMode ? 'Save changes' : 'Save meal'))}
        </button>
        <Link
          href={cancelHref ?? returnTo ?? '/today'}
          className="block w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-sm font-medium text-neutral-300 transition hover:bg-white/[0.08]"
        >
          Cancel
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-base font-semibold text-white tabular-nums">{value}</p>
      <p className="mt-0.5 text-[10px] tracking-wider text-neutral-500 uppercase">{label}</p>
    </div>
  );
}
