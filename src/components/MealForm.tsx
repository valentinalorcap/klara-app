'use client';

import { useState, useMemo, useRef, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { AnimatePresence } from 'framer-motion';
import {
  Star,
  Sunrise,
  Dumbbell,
  Sandwich,
  Cookie,
  Moon,
  Utensils,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react';
import { GlassCard } from './GlassCard';
import { type LibraryItem } from './IngredientPicker';
import { IngredientTabs } from './IngredientTabs';
import { MacroStats } from './MacroStats';
import {
  IngredientSwipeRow,
  rowFromItem,
  rowFromEstimate,
  type IngredientRow,
} from './IngredientRow';
import { MEAL_TYPE_OPTIONS, type MealType, sumEntries, isoDate } from '@/lib/meals';
import { createMeal, updateMeal } from '@/app/(app)/today/actions';
import type { EstimationEntry } from '@/lib/freeTextEstimation';
import { mealDefaultEmoji } from '@/lib/mealEmoji';
import { cn } from '@/lib/utils';

/** Per-type icon so each meal-type chip is recognizable at a glance. */
const MEAL_TYPE_ICONS: Record<MealType, LucideIcon> = {
  BREAKFAST: Sunrise,
  PREWORKOUT: Dumbbell,
  LUNCH: Sandwich,
  SNACK: Cookie,
  DINNER: Moon,
  OTHER: Utensils,
};

export type FavoriteMeal = {
  id: string;
  type: MealType;
  name: string | null;
  icon: string | null;
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
  /** The meal's own day (`YYYY-MM-DD`). On edit, preserved so saving never
   *  moves the meal to today. */
  date?: string;
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
  templateId?: string;
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
  defaultDate,
  onAddToBatch,
  submitLabel,
  cancelHref,
  hideFavoritesButton = false,
  controlledFavoritesOpen,
  onCloseFavorites,
  onValidChange,
  hideActions = false,
}: {
  items: LibraryItem[];
  favorites: FavoriteMeal[];
  initial?: MealInitialValues;
  /** Where the form should redirect after a successful save. */
  returnTo?: string;
  /** Day (`YYYY-MM-DD`) a NEW meal attaches to. Defaults to today. */
  defaultDate?: string;
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
  /**
   * Builder mode: report the current meal as a payload (or null when it has
   * no valid entries) whenever it changes, so a parent can stage / save it.
   * Must be referentially stable (wrap in useCallback).
   */
  onValidChange?: (payload: MealFormPayload | null) => void;
  /** Hide the form's own Save/Cancel buttons — the parent renders actions. */
  hideActions?: boolean;
}) {
  const editMode = Boolean(initial?.mealId);
  const batchMode = Boolean(onAddToBatch);
  const [type, setType] = useState<MealType>(initial?.type ?? 'SNACK');
  const [name, setName] = useState(initial?.name ?? '');
  const [templateId, setTemplateId] = useState<string | undefined>(undefined);
  // Monotonic row-id source for rows added at runtime. Seeded past the initial
  // rows (which get deterministic index ids) so ids never collide, and so the
  // ref is never read during render — initial ids stay hydration-stable.
  const rowIdSeq = useRef(initial?.entries.length ?? 0);
  const nextRowId = () => `row-${rowIdSeq.current++}`;
  const [rows, setRows] = useState<IngredientRow[]>(
    initial?.entries.length
      ? initial.entries.map((e, i) => ({
          id: `row-${i}`,
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

  // The current meal as a save-ready payload, or null when it has no valid
  // entries. Both the Save button and the builder-mode report use this.
  const currentPayload = useMemo<MealFormPayload | null>(() => {
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
    if (entries.length === 0) return null;
    return {
      // Edit: keep the meal's own day. New: the target day (a navigated past/
      // future day) or today. Never silently move a meal to today.
      date: initial?.date ?? defaultDate ?? isoDate(new Date()),
      type,
      name: name.trim() || undefined,
      templateId,
      entries,
    };
  }, [rows, type, name, templateId, initial?.date, defaultDate]);

  useEffect(() => {
    onValidChange?.(currentPayload);
  }, [currentPayload, onValidChange]);

  function updateGrams(index: number, grams: string) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, grams } : r)));
  }
  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }
  function addRowFromItem(item: LibraryItem, grams: number) {
    setRows((prev) => [...prev, rowFromItem(item, grams, nextRowId())]);
  }
  function addRowsFromEstimate(entries: EstimationEntry[]) {
    setRows((prev) => [...prev, ...entries.map((e) => rowFromEstimate(e, nextRowId()))]);
  }

  function importFavorite(fav: FavoriteMeal) {
    setRows(
      fav.entries.map((e) => ({
        id: nextRowId(),
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
    setTemplateId(fav.id);
  }

  function resetForm() {
    setType('SNACK');
    setName('');
    setRows([]);
    setTemplateId(undefined);
    setError(null);
  }

  function handleSubmit() {
    setError(null);
    if (!currentPayload) {
      setError('Add at least one ingredient with grams.');
      return;
    }
    const payload = currentPayload;

    if (onAddToBatch) {
      onAddToBatch(payload);
      resetForm();
      return;
    }

    startTransition(async () => {
      const result =
        editMode && initial?.mealId
          ? await updateMeal(initial.mealId, payload, returnTo)
          : await createMeal(payload, returnTo);
      // On success the action redirects to /today; we only get here on error.
      if (result && !result.ok) setError(result.error);
    });
  }

  return (
    <div className="space-y-5">
      <GlassCard className="space-y-3 p-5">
        <div className="grid grid-cols-3 gap-2">
          {MEAL_TYPE_OPTIONS.map((opt) => {
            const Icon = MEAL_TYPE_ICONS[opt.value];
            const active = type === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setType(opt.value)}
                aria-pressed={active}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-2.5 text-[11px] font-medium transition',
                  active
                    ? 'border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)]'
                    : 'border-white/10 bg-white/[0.04] text-neutral-300 hover:bg-white/[0.08]',
                )}
              >
                <Icon size={16} className={active ? 'text-[var(--accent)]' : 'text-neutral-400'} />
                {opt.label}
              </button>
            );
          })}
        </div>
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

      {rows.length > 0 ? (
        <GlassCard className="p-5">
          <ul>
            <AnimatePresence initial={false}>
              {rows.map((row, i) => (
                <IngredientSwipeRow
                  key={row.id}
                  row={row}
                  isLast={i === rows.length - 1}
                  onGramsChange={(grams) => updateGrams(i, grams)}
                  onRemove={() => removeRow(i)}
                />
              ))}
            </AnimatePresence>
          </ul>
        </GlassCard>
      ) : null}

      <GlassCard className="p-5">
        <IngredientTabs
          items={items}
          onAddItem={addRowFromItem}
          onAddEstimate={addRowsFromEstimate}
          onError={setError}
        />
      </GlassCard>

      <MacroStats
        title="Total (live)"
        kcal={totals.kcal}
        protein={totals.protein}
        carbs={totals.carbs}
        fat={totals.fat}
      />

      {error ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}

      {!hideActions ? (
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
      ) : null}
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
  // Every meal-type section starts collapsed so the list is easy to scan by
  // type; tapping a header expands just that one.
  const [expanded, setExpanded] = useState<Set<MealType>>(new Set());
  const toggle = (type: MealType) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pick a favorite meal"
      className="fixed inset-0 z-50 flex flex-col bg-[var(--background-bottom)]/95 backdrop-blur-xl"
    >
      <header className="flex items-center justify-between border-b border-white/10 px-6 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-4">
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
      <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4 pb-[max(env(safe-area-inset-bottom),7rem)]">
        {MEAL_TYPE_OPTIONS.map((opt) => {
          const group = favorites.filter((f) => f.type === opt.value);
          if (group.length === 0) return null;
          const Icon = MEAL_TYPE_ICONS[opt.value];
          const isOpen = expanded.has(opt.value);
          return (
            <section key={opt.value}>
              <button
                type="button"
                onClick={() => toggle(opt.value)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-1.5 rounded-xl py-2 text-[11px] font-semibold tracking-wider text-neutral-400 uppercase transition hover:text-neutral-200"
              >
                <Icon size={13} className="text-neutral-500" />
                {opt.label}
                <span className="text-neutral-600">· {group.length}</span>
                <ChevronDown
                  size={15}
                  className={cn(
                    'ml-auto text-neutral-500 transition-transform',
                    isOpen && 'rotate-180',
                  )}
                />
              </button>
              {isOpen ? (
                <ul className="mt-2 space-y-2">
                  {group.map((f) => {
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
                    const emoji = f.icon ?? mealDefaultEmoji(f);
                    return (
                      <li key={f.id}>
                        <button
                          type="button"
                          onClick={() => onPick(f)}
                          className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-left transition hover:border-white/20 hover:bg-white/[0.08] active:scale-[0.99]"
                        >
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-xl">
                            {emoji}
                          </span>
                          <span className="flex min-w-0 flex-col gap-1">
                            {f.name ? (
                              <span className="truncate text-sm font-semibold text-white">
                                {f.name}
                              </span>
                            ) : null}
                            <span className="text-xs text-white tabular-nums">
                              {Math.round(totals.kcal)}
                              <span className="text-neutral-400"> kcal</span>
                              <span className="mx-1.5 text-neutral-500">·</span>
                              <span className="text-neutral-400">P </span>
                              {totals.protein.toFixed(0)}g
                              <span className="mx-1.5 text-neutral-500">·</span>
                              <span className="text-neutral-400">C </span>
                              {totals.carbs.toFixed(0)}g
                              <span className="mx-1.5 text-neutral-500">·</span>
                              <span className="text-neutral-400">F </span>
                              {totals.fat.toFixed(0)}g
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
