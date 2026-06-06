'use client';

import { useState, useMemo, useTransition } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Trash2, Star } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { type LibraryItem } from './IngredientPicker';
import { IngredientSearch } from './IngredientSearch';
import {
  MEAL_TYPE_OPTIONS,
  MEAL_TYPE_LABELS,
  type MealType,
  sumEntries,
  entryMacros,
  isoDate,
} from '@/lib/meals';
import { createMeal, updateMeal } from '@/app/(app)/today/actions';
import type { EstimationEntry } from '@/lib/freeTextEstimation';
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

function rowFromItem(item: LibraryItem, grams: number): IngredientRow {
  return {
    name: item.name,
    grams: String(grams),
    resolved: true,
    productId: item.kind === 'product' ? item.id : undefined,
    recipeId: item.kind === 'recipe' ? item.id : undefined,
    kcalPer100g: item.kcalPer100g,
    proteinPer100g: item.proteinPer100g,
    carbsPer100g: item.carbsPer100g,
    fatPer100g: item.fatPer100g,
  };
}

function rowFromEstimate(e: EstimationEntry): IngredientRow {
  return {
    name: e.name,
    grams: String(Math.round(e.grams)),
    resolved: true,
    kcalPer100g: e.kcalPer100g,
    proteinPer100g: e.proteinPer100g,
    carbsPer100g: e.carbsPer100g,
    fatPer100g: e.fatPer100g,
  };
}

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
  hideFavoritesButton = false,
  controlledFavoritesOpen,
  onCloseFavorites,
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
  /**
   * Hide the in-form "Favorites · N saved" trigger. /today/new uses a
   * page-level pill instead and controls the picker externally.
   */
  hideFavoritesButton?: boolean;
  /** Controlled open state for the picker; pairs with `onCloseFavorites`. */
  controlledFavoritesOpen?: boolean;
  /** Called when the controlled picker should close. */
  onCloseFavorites?: () => void;
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
      : [],
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [internalFavoritesOpen, setInternalFavoritesOpen] = useState(false);
  const [openSwipeIndex, setOpenSwipeIndex] = useState<number | null>(null);
  const isFavoritesControlled = controlledFavoritesOpen !== undefined;
  const favoritesOpen = isFavoritesControlled ? controlledFavoritesOpen : internalFavoritesOpen;
  const closeFavorites = () => {
    if (isFavoritesControlled) onCloseFavorites?.();
    else setInternalFavoritesOpen(false);
  };

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

  function updateGrams(index: number, grams: string) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, grams } : r)));
  }
  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }
  function addRowFromItem(item: LibraryItem, grams: number) {
    setRows((prev) => [...prev, rowFromItem(item, grams)]);
  }
  function addRowsFromEstimate(entries: EstimationEntry[]) {
    setRows((prev) => [...prev, ...entries.map(rowFromEstimate)]);
  }

  function importFavorite(fav: FavoriteMeal) {
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
    setType(fav.type);
    setName(fav.name ?? '');
  }

  function resetForm() {
    setType('BREAKFAST');
    setName('');
    setRows([]);
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
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name (optional)"
          className="block w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:bg-white/[0.08] focus:ring-2 focus:ring-[var(--accent)]/60 focus:outline-none"
        />
      </GlassCard>

      {favorites.length > 0 && !hideFavoritesButton ? (
        <button
          type="button"
          onClick={() => setInternalFavoritesOpen(true)}
          className="flex w-full items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm font-medium text-neutral-200 transition hover:bg-white/[0.08]"
        >
          <span className="flex items-center gap-2">
            <Star size={14} className="text-yellow-400" fill="currentColor" />
            Favorites
          </span>
          <span className="text-xs text-neutral-500">{favorites.length} saved</span>
        </button>
      ) : null}

      {favoritesOpen ? (
        <FavoritesPicker
          favorites={favorites}
          onClose={closeFavorites}
          onPick={(fav) => {
            importFavorite(fav);
            closeFavorites();
          }}
        />
      ) : null}

      <GlassCard className="space-y-4 p-5">
        {rows.length > 0 ? (
          <ul>
            {rows.map((row, i) => {
              const grams = Number(row.grams) || 0;
              const m = entryMacros({
                grams,
                kcalPer100g: row.kcalPer100g,
                proteinPer100g: row.proteinPer100g,
                carbsPer100g: row.carbsPer100g,
                fatPer100g: row.fatPer100g,
              });
              const isOpen = openSwipeIndex === i;
              return (
                <li
                  key={i}
                  className={cn(
                    'relative overflow-hidden',
                    i < rows.length - 1 && 'border-b border-white/5',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => {
                      removeRow(i);
                      setOpenSwipeIndex(null);
                    }}
                    aria-label="Remove ingredient"
                    className="absolute top-0 right-0 bottom-0 flex w-14 items-center justify-center bg-[var(--danger)]/10 text-[var(--danger)] transition hover:bg-[var(--danger)]/20"
                  >
                    <Trash2 size={14} />
                  </button>
                  <motion.div
                    drag="x"
                    dragConstraints={{ left: -56, right: 0 }}
                    dragElastic={0.15}
                    animate={{ x: isOpen ? -56 : 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    onDragEnd={(_, info) => {
                      if (info.offset.x < -28 || info.velocity.x < -400) {
                        setOpenSwipeIndex(i);
                      } else {
                        setOpenSwipeIndex(null);
                      }
                    }}
                    className="relative flex cursor-grab items-center gap-3 bg-[#171432] py-3 active:cursor-grabbing"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{row.name}</p>
                      <p className="mt-0.5 text-xs text-neutral-400 tabular-nums">
                        {Math.round(m.kcal)} kcal · P {m.protein.toFixed(1)}g · C{' '}
                        {m.carbs.toFixed(1)}g · F {m.fat.toFixed(1)}g
                      </p>
                    </div>
                    <div className="flex shrink-0 items-baseline gap-1">
                      <input
                        type="number"
                        inputMode="decimal"
                        value={row.grams}
                        onChange={(e) => updateGrams(i, e.target.value)}
                        placeholder="100"
                        aria-label="Grams"
                        className="w-11 rounded-xl border border-white/10 bg-white/[0.04] px-1.5 py-1 text-right text-sm text-white tabular-nums placeholder:text-neutral-500 focus:bg-white/[0.08] focus:ring-2 focus:ring-[var(--accent)]/60 focus:outline-none"
                      />
                      <span className="text-xs text-neutral-400">g</span>
                    </div>
                  </motion.div>
                </li>
              );
            })}
          </ul>
        ) : null}

        <IngredientSearch
          items={items}
          onAddItem={addRowFromItem}
          onAddEstimate={addRowsFromEstimate}
          onError={setError}
        />
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

function FavoritesPicker({
  favorites,
  onClose,
  onPick,
}: {
  favorites: FavoriteMeal[];
  onClose: () => void;
  onPick: (fav: FavoriteMeal) => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pick a favorite meal"
      className="fixed inset-0 z-50 flex flex-col bg-[var(--background-bottom)]/95 backdrop-blur-xl"
    >
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <h2 className="text-base font-semibold text-white">Favorites</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close favorites"
          className="text-sm text-neutral-400 transition hover:text-white"
        >
          Cancel
        </button>
      </header>
      <ul className="flex-1 space-y-2 overflow-y-auto px-6 py-4">
        {favorites.map((f) => {
          const totals = f.entries.reduce(
            (acc, e) => {
              const factor = e.grams / 100;
              acc.kcal += e.kcalPer100g * factor;
              acc.protein += e.proteinPer100g * factor;
              acc.carbs += e.carbsPer100g * factor;
              acc.fat += e.fatPer100g * factor;
              return acc;
            },
            { kcal: 0, protein: 0, carbs: 0, fat: 0 },
          );
          return (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => onPick(f)}
                className="flex w-full flex-col gap-1 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-white/20 hover:bg-white/[0.08] active:scale-[0.99]"
              >
                <span className="text-[10px] font-medium tracking-wider text-[var(--accent)] uppercase">
                  {MEAL_TYPE_LABELS[f.type]}
                </span>
                {f.name ? (
                  <span className="truncate text-sm font-semibold text-white">{f.name}</span>
                ) : null}
                <span className="text-xs text-white tabular-nums">
                  {Math.round(totals.kcal)}
                  <span className="text-neutral-400"> kcal</span>
                  <span className="mx-1.5 text-neutral-500">·</span>
                  <span className="text-neutral-400">P </span>
                  {totals.protein.toFixed(0)}g<span className="mx-1.5 text-neutral-500">·</span>
                  <span className="text-neutral-400">C </span>
                  {totals.carbs.toFixed(0)}g<span className="mx-1.5 text-neutral-500">·</span>
                  <span className="text-neutral-400">F </span>
                  {totals.fat.toFixed(0)}g
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
