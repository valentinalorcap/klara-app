'use client';

import { useState, useTransition, useRef, useEffect, type MouseEvent } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Star, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
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
  returnTo = '/today',
  showDelete = true,
}: {
  meal: {
    id: string;
    type: MealType;
    name: string | null;
    isFavorite: boolean;
    entries: MealCardEntry[];
  };
  returnTo?: string;
  showDelete?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingStar, startStar] = useTransition();
  const [pendingDelete, startDelete] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);
  const totals = sumEntries(meal.entries);

  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick(e: globalThis.MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [menuOpen]);

  function onStar(e: MouseEvent) {
    e.stopPropagation();
    startStar(async () => {
      await toggleFavorite(meal.id);
    });
  }

  function onMenuToggle(e: MouseEvent) {
    e.stopPropagation();
    setMenuOpen((v) => !v);
  }

  function onDelete(e: MouseEvent) {
    e.stopPropagation();
    setMenuOpen(false);
    const label = meal.name ?? MEAL_TYPE_LABELS[meal.type];
    if (!confirm(`Delete "${label}"?`)) return;
    startDelete(async () => {
      await deleteMeal(meal.id);
    });
  }

  return (
    <GlassCard
      className="cursor-pointer p-5 transition hover:border-white/20"
      onClick={() => setExpanded((v) => !v)}
    >
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
          {showDelete ? (
            <div ref={menuRef} className="relative">
              <IconButton
                label="More actions"
                onClick={onMenuToggle}
                disabled={pendingDelete}
                className="text-neutral-400 hover:text-white"
              >
                <MoreHorizontal size={18} />
              </IconButton>
              {menuOpen ? (
                <div className="absolute top-full right-0 z-20 mt-1 w-36 overflow-hidden rounded-2xl border border-white/10 bg-[#1a1633]/95 p-1 shadow-2xl backdrop-blur-xl">
                  <Link
                    href={`/today/${meal.id}/edit?from=${encodeURIComponent(returnTo)}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white transition hover:bg-white/5"
                  >
                    <Pencil size={14} className="text-neutral-400" />
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={onDelete}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-[var(--danger)] transition hover:bg-[var(--danger)]/10"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <p className="mt-3 text-2xl font-bold whitespace-nowrap text-white tabular-nums">
        {totals.protein.toFixed(1)}
        <span className="text-sm font-medium text-neutral-400">g P</span>
        <span className="mx-2 text-neutral-500">·</span>
        {Math.round(totals.kcal)}
        <span className="text-sm font-medium text-neutral-400"> kcal</span>
      </p>
      <p className="mt-1 text-xs text-neutral-400 tabular-nums">
        C {totals.carbs.toFixed(1)}g · F {totals.fat.toFixed(1)}g
      </p>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 28 }}
            className="overflow-hidden"
          >
            <li aria-hidden className="mt-4 h-px bg-white/5" />
            {meal.entries.map((e) => {
              const m = entryMacros(e);
              return (
                <li
                  key={e.id}
                  className="flex items-baseline justify-between gap-3 pt-2 text-xs text-neutral-400 tabular-nums"
                >
                  <span className="min-w-0 flex-1 truncate text-neutral-300">{e.name}</span>
                  <span className="shrink-0 text-neutral-500">
                    {e.grams.toFixed(0)}g · {Math.round(m.kcal)} kcal · {m.protein.toFixed(1)}g P
                  </span>
                </li>
              );
            })}
          </motion.ul>
        ) : null}
      </AnimatePresence>
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
  onClick: (e: MouseEvent) => void;
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
