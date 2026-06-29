'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { ProductIconAvatar } from './ProductIcon';
import { ProductInUseToggle } from './ProductInUseToggle';
import { deleteProductInline } from '@/app/(app)/products/actions';
import { cn } from '@/lib/utils';

export type ProductCardData = {
  id: string;
  name: string;
  brand: string | null;
  icon: string | null;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  suggestedPortionGrams: number | null;
  inUse: boolean;
};

/**
 * A product in the library list. Tap to edit, swipe left to reveal a trash
 * button (same gesture as removing an ingredient in add meal). Shows kcal per
 * suggested portion when one is set (with the portion in grams), else per 100g.
 */
export function ProductCard({ product }: { product: ProductCardData }) {
  const router = useRouter();
  const x = useMotionValue(0);
  const trashOpacity = useTransform(x, [-64, -24, 0], [1, 0, 0]);
  const [pendingDelete, startDelete] = useTransition();

  // With a suggested portion, show everything for that portion; else per 100g.
  const portion = product.suggestedPortionGrams;
  const factor = portion ? portion / 100 : 1;
  const kcal = Math.round(product.kcalPer100g * factor);
  const protein = product.proteinPer100g * factor;
  const carbs = product.carbsPer100g * factor;
  const fat = product.fatPer100g * factor;
  const perLabel = portion ? `per ${Math.round(portion)}g` : 'per 100g';

  function onDelete() {
    if (!window.confirm(`Delete "${product.name}"?`)) return;
    startDelete(async () => {
      await deleteProductInline(product.id);
    });
  }

  return (
    <div className="relative overflow-hidden rounded-3xl">
      <motion.button
        type="button"
        style={{ opacity: trashOpacity }}
        onClick={onDelete}
        disabled={pendingDelete}
        aria-label={`Delete ${product.name}`}
        className="absolute top-0 right-0 bottom-0 flex w-16 items-center justify-center text-[var(--danger)]"
      >
        <Trash2 size={18} />
      </motion.button>

      <motion.div
        style={{ x }}
        drag="x"
        dragConstraints={{ left: -64, right: 0 }}
        dragElastic={0.15}
        onDragEnd={(_, info) => {
          const open = info.offset.x < -32 || info.velocity.x < -400;
          animate(x, open ? -64 : 0, { type: 'spring', stiffness: 400, damping: 30 });
        }}
        className="relative"
      >
        <GlassCard
          noAnimate
          onClick={() => router.push(`/products/${product.id}/edit`)}
          className={cn(
            'cursor-pointer p-4 transition hover:border-white/20 active:scale-[0.99]',
            product.inUse && 'border-[var(--accent)]/30',
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <ProductIconAvatar product={product} className="h-9 w-9" iconSize={16} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{product.name}</p>
                {product.brand ? (
                  <p className="truncate text-xs text-neutral-400">{product.brand}</p>
                ) : null}
              </div>
            </div>
            <ProductInUseToggle id={product.id} inUse={product.inUse} />
          </div>

          <div className="my-3 h-px bg-white/5" />

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-neutral-400 tabular-nums">
              <span className="font-semibold text-white">{kcal} kcal</span>
              {` · P ${protein.toFixed(1)}g · C ${carbs.toFixed(1)}g · F ${fat.toFixed(1)}g`}
            </p>
            <span
              className={cn(
                'shrink-0 text-xs tabular-nums',
                portion ? 'text-[var(--accent-text)]' : 'text-neutral-500',
              )}
            >
              {perLabel}
            </span>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}
