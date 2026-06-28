'use client';

import { useState, useTransition, useRef, useEffect, type MouseEvent } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  MoreVertical,
  Pencil,
  PenLine,
  Sunrise,
  Dumbbell,
  Sandwich,
  Cookie,
  Moon,
  Utensils,
  type LucideIcon,
} from 'lucide-react';
import { GlassCard } from './GlassCard';
import { ProductIcon } from './ProductIcon';
import { renameFavorite } from '@/app/(app)/today/actions';
import { MEAL_TYPE_LABELS, type MealType, entryMacros, sumEntries } from '@/lib/meals';
import { mealIconName } from '@/lib/productIcons';
import { cn } from '@/lib/utils';

const MEAL_TYPE_ICONS: Record<MealType, LucideIcon> = {
  BREAKFAST: Sunrise,
  PREWORKOUT: Dumbbell,
  LUNCH: Sandwich,
  SNACK: Cookie,
  DINNER: Moon,
  OTHER: Utensils,
};

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
  const TypeIcon = MEAL_TYPE_ICONS[template.type];
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(template.name ?? '');
  const [pendingRename, startRename] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const totals = sumEntries(template.entries);

  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick(e: globalThis.MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [menuOpen]);

  useEffect(() => {
    if (renaming) renameInputRef.current?.focus();
  }, [renaming]);

  function onMenuToggle(e: MouseEvent) {
    e.stopPropagation();
    setMenuOpen((v) => !v);
  }

  function onRename(e: MouseEvent) {
    e.stopPropagation();
    setMenuOpen(false);
    setRenameValue(template.name ?? '');
    setRenaming(true);
  }

  function saveRename() {
    setRenaming(false);
    const trimmed = renameValue.trim();
    if (trimmed === (template.name ?? '')) return;
    startRename(async () => {
      await renameFavorite(template.id, trimmed);
    });
  }

  return (
    <GlassCard
      className={cn(
        'cursor-pointer p-4 transition active:scale-[0.995]',
        menuOpen && 'relative z-30',
        expanded
          ? 'border-white/15'
          : 'border-white/10 shadow-[0_1px_0_rgba(255,255,255,0.06)_inset,0_8px_32px_-12px_rgba(0,0,0,0.4)] hover:border-white/20',
      )}
      onClick={() => setExpanded((v) => !v)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 gap-3">
          <span className="mt-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px] border border-white/10 bg-white/[0.06] text-[var(--accent)]">
            <ProductIcon name={mealIconName(template)} size={26} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 text-[10px] font-medium tracking-wider text-[var(--accent)] uppercase">
              <TypeIcon size={11} />
              {MEAL_TYPE_LABELS[template.type]}
            </p>
            {renaming ? (
              <input
                ref={renameInputRef}
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    saveRename();
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    setRenaming(false);
                  }
                }}
                onBlur={saveRename}
                className="mt-0.5 w-full border-b border-[var(--accent)]/50 bg-transparent text-sm font-semibold text-white outline-none focus:border-[var(--accent)]"
              />
            ) : template.name ? (
              <h3
                className={cn(
                  'mt-0.5 line-clamp-2 text-sm font-semibold text-white',
                  pendingRename && 'opacity-50',
                )}
              >
                {template.name}
              </h3>
            ) : null}
            <p className="mt-2 text-sm font-medium whitespace-nowrap text-white tabular-nums">
              {Math.round(totals.kcal)}
              <span className="text-neutral-400"> kcal</span>
              <span className="mx-2 text-neutral-500">·</span>
              <span className="text-neutral-400">P </span>
              {totals.protein.toFixed(0)}g<span className="mx-1.5 text-neutral-500">·</span>
              <span className="text-neutral-400">C </span>
              {totals.carbs.toFixed(0)}g<span className="mx-1.5 text-neutral-500">·</span>
              <span className="text-neutral-400">F </span>
              {totals.fat.toFixed(0)}g
            </p>
          </div>
        </div>
        <div ref={menuRef} className="relative shrink-0">
          <button
            type="button"
            aria-label="More actions"
            onClick={onMenuToggle}
            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition hover:text-white"
          >
            <MoreVertical size={18} />
          </button>
          {menuOpen ? (
            <div className="absolute top-full right-0 z-20 mt-1 w-40 overflow-hidden rounded-2xl border border-white/10 bg-[#1a1633]/95 p-1 shadow-2xl backdrop-blur-xl">
              <Link
                href={`/library/favorites/${template.id}/edit`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white transition hover:bg-white/5"
              >
                <Pencil size={14} className="text-neutral-400" />
                Edit
              </Link>
              <button
                type="button"
                onClick={onRename}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-white transition hover:bg-white/5"
              >
                <PenLine size={14} className="text-neutral-400" />
                Rename
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 28 }}
            className="overflow-hidden"
          >
            <ul className="mt-2 border-t border-white/5 pt-2">
              {template.entries.map((e) => {
                const m = entryMacros(e);
                return (
                  <li
                    key={e.id}
                    className="flex items-baseline justify-between gap-3 pt-2 text-xs text-neutral-400"
                  >
                    <div className="flex min-w-0 flex-1 items-baseline gap-1.5">
                      <span className="min-w-0 truncate text-neutral-300">{e.name}</span>
                      <span className="shrink-0 text-neutral-500 tabular-nums">
                        {e.grams.toFixed(0)}g
                      </span>
                    </div>
                    <span className="shrink-0 text-neutral-500 tabular-nums">
                      {Math.round(m.kcal)} kcal · P {m.protein.toFixed(1)}g
                    </span>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="mt-4 flex justify-center" aria-hidden>
        <span
          className={cn(
            'h-[5px] w-12 rounded-full transition-colors',
            expanded ? 'bg-white/15' : 'bg-white/25',
          )}
        />
      </div>
    </GlassCard>
  );
}
