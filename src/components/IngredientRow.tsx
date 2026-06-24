'use client';

import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { type LibraryItem } from './IngredientPicker';
import { entryMacros } from '@/lib/meals';
import type { EstimationEntry } from '@/lib/freeTextEstimation';
import { cn } from '@/lib/utils';

/** One ingredient line being built in a meal or recipe form. */
export type IngredientRow = {
  /** Stable per-row key so swipe state follows the row, not its index. */
  id: string;
  name: string;
  /** Stored as a string while editing so the grams input can be cleared. */
  grams: string;
  resolved: boolean;
  productId?: string;
  recipeId?: string;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
};

export function rowFromItem(item: LibraryItem, grams: number, id: string): IngredientRow {
  return {
    id,
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

export function rowFromEstimate(e: EstimationEntry, id: string): IngredientRow {
  return {
    id,
    name: e.name,
    grams: String(Math.round(e.grams)),
    resolved: true,
    // A free-text entry that resolved to one of the user's foods carries the
    // link, so the saved entry snapshots from that product/recipe.
    productId: e.productId,
    recipeId: e.recipeId,
    kcalPer100g: e.kcalPer100g,
    proteinPer100g: e.proteinPer100g,
    carbsPer100g: e.carbsPer100g,
    fatPer100g: e.fatPer100g,
  };
}

/** A row with a grams input and a swipe-left-to-reveal trash button. */
export function IngredientSwipeRow({
  row,
  isLast,
  onGramsChange,
  onRemove,
}: {
  row: IngredientRow;
  isLast: boolean;
  onGramsChange: (grams: string) => void;
  onRemove: () => void;
}) {
  const x = useMotionValue(0);
  // Trash fades in as the user drags past ~20px so the row at rest sits
  // on the card's translucent surface — no fake solid background needed.
  const trashOpacity = useTransform(x, [-56, -20, 0], [1, 0, 0]);

  const grams = Number(row.grams) || 0;
  const m = entryMacros({
    grams,
    kcalPer100g: row.kcalPer100g,
    proteinPer100g: row.proteinPer100g,
    carbsPer100g: row.carbsPer100g,
    fatPer100g: row.fatPer100g,
  });

  return (
    <li className={cn('relative overflow-hidden', !isLast && 'border-b border-white/5')}>
      <motion.button
        type="button"
        style={{ opacity: trashOpacity }}
        onClick={onRemove}
        aria-label="Remove ingredient"
        className="absolute top-0 right-0 bottom-0 flex w-14 items-center justify-center text-[var(--danger)]"
      >
        <Trash2 size={14} />
      </motion.button>
      <motion.div
        style={{ x }}
        drag="x"
        dragConstraints={{ left: -56, right: 0 }}
        dragElastic={0.15}
        onDragEnd={(_, info) => {
          const open = info.offset.x < -28 || info.velocity.x < -400;
          animate(x, open ? -56 : 0, { type: 'spring', stiffness: 400, damping: 30 });
        }}
        className="relative flex cursor-grab items-center gap-3 py-3 active:cursor-grabbing"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{row.name}</p>
          <p className="mt-0.5 text-xs text-neutral-400 tabular-nums">
            <span className="text-white">{Math.round(m.kcal)}</span> kcal
            <span className="mx-1 text-neutral-500">·</span>P{' '}
            <span className="text-white">{Math.round(m.protein)}g</span>
            <span className="mx-1 text-neutral-500">·</span>C{' '}
            <span className="text-white">{Math.round(m.carbs)}g</span>
            <span className="mx-1 text-neutral-500">·</span>F{' '}
            <span className="text-white">{Math.round(m.fat)}g</span>
          </p>
        </div>
        <div className="flex shrink-0 items-baseline gap-1">
          <input
            type="number"
            inputMode="decimal"
            value={row.grams}
            onChange={(e) => onGramsChange(e.target.value)}
            placeholder="100"
            aria-label="Grams"
            className="w-11 rounded-xl border border-white/10 bg-white/[0.04] px-1.5 py-1 text-right text-sm text-white tabular-nums placeholder:text-neutral-500 focus:bg-white/[0.08] focus:ring-2 focus:ring-[var(--accent)]/60 focus:outline-none"
          />
          <span className="text-xs text-neutral-400">g</span>
        </div>
      </motion.div>
    </li>
  );
}
