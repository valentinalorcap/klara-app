'use client';

import { useState, useTransition, useRef, useEffect, useCallback, type MouseEvent } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Star, MoreVertical, Pencil, PenLine, Trash2, Copy, Smile } from 'lucide-react';
import { GlassCard } from './GlassCard';
import {
  toggleFavorite,
  deleteMeal,
  copyMealToToday,
  renameMeal,
  updateMealIcon,
} from '@/app/(app)/today/actions';
import { MEAL_TYPE_LABELS, type MealType, entryMacros, sumEntries } from '@/lib/meals';
import { mealIconName } from '@/lib/productIcons';
import { useToast } from './Toast';
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

export type MealCardMeal = {
  id: string;
  type: MealType;
  name: string | null;
  icon: string | null;
  isFavorite: boolean;
  entries: MealCardEntry[];
};

// Maps vector icon names → closest emoji equivalent
const ICON_TO_EMOJI: Record<string, string> = {
  'tabler:coffee': '☕',
  'lucide:drumstick': '🍗',
  'lucide:ham': '🥩',
  'tabler:sausage': '🌭',
  'lucide:shrimp': '🦐',
  'tabler:fish': '🐟',
  'tabler:eggs': '🥚',
  'tabler:egg': '🥚',
  'lucide:bean': '🫘',
  'tabler:nut': '🥜',
  'lucide:vegan': '🌱',
  'tabler:barbell': '💪',
  'lucide:croissant': '🥐',
  'tabler:baguette': '🥖',
  'tabler:bread': '🍞',
  'tabler:pizza': '🍕',
  'tabler:burger': '🍔',
  'lucide:sandwich': '🥪',
  'tabler:dumpling': '🥟',
  'lucide:popcorn': '🍿',
  'tabler:soup': '🍲',
  'tabler:salad': '🥗',
  'tabler:bowl-spoon': '🍝',
  'tabler:grain': '🌾',
  'tabler:wheat': '🌾',
  'tabler:avocado': '🥑',
  'tabler:apple': '🍎',
  'tabler:banana': '🍌',
  'tabler:grape': '🍇',
  'tabler:cherry': '🍒',
  'tabler:lemon': '🍋',
  'tabler:carrot': '🥕',
  'tabler:pepper': '🌶️',
  'tabler:mushroom': '🍄',
  'tabler:chocolate': '🍫',
  'tabler:cookie': '🍪',
  'tabler:ice-cream': '🍦',
  'lucide:donut': '🍩',
  'tabler:cake': '🎂',
  'lucide:dessert': '🍮',
  'tabler:candy': '🍬',
  'tabler:teapot': '🍵',
  'lucide:glass-water': '💧',
  'lucide:cup-soda': '🥤',
  'tabler:beer': '🍺',
  'tabler:glass-champagne': '🥂',
  'lucide:wine': '🍷',
  'lucide:martini': '🍸',
  'tabler:glass-cocktail': '🍹',
  'tabler:milk': '🥛',
  'lucide:utensils-crossed': '🍽️',
};

function mealDefaultEmoji(meal: {
  name?: string | null;
  entries: ReadonlyArray<{ name: string; grams: number; kcalPer100g: number }>;
}): string {
  const iconName = mealIconName(meal);
  return ICON_TO_EMOJI[iconName] ?? '🍽️';
}

// Detect a single emoji from text typed into the native keyboard
function extractEmoji(text: string): string | null {
  const match = text.match(/\p{Emoji_Presentation}/u);
  return match?.[0] ?? null;
}

export function MealCard({
  meal,
  returnTo = '/today',
  showDelete = true,
}: {
  meal: MealCardMeal;
  returnTo?: string;
  showDelete?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(meal.name ?? '');
  const [pendingRename, startRename] = useTransition();
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [currentIcon, setCurrentIcon] = useState(meal.icon);
  const [pendingStar, startStar] = useTransition();
  const [pendingDelete, startDelete] = useTransition();
  const [pendingCopy, startCopy] = useTransition();
  const [pendingIcon, startIcon] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const emojiInputRef = useRef<HTMLInputElement>(null);
  const { show } = useToast();
  const totals = sumEntries(meal.entries);

  const displayEmoji = currentIcon ?? mealDefaultEmoji(meal);

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

  useEffect(() => {
    if (iconPickerOpen) emojiInputRef.current?.focus();
  }, [iconPickerOpen]);

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

  function onCopy(e: MouseEvent) {
    e.stopPropagation();
    setMenuOpen(false);
    startCopy(async () => {
      const result = await copyMealToToday(meal.id);
      if (result && !result.ok) {
        window.alert(result.error);
        return;
      }
      show('Added to today');
    });
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

  function onStartRename(e: MouseEvent) {
    e.stopPropagation();
    setMenuOpen(false);
    setRenameValue(meal.name ?? '');
    setRenaming(true);
  }

  function onRenameKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') commitRename();
    if (e.key === 'Escape') setRenaming(false);
  }

  function commitRename() {
    setRenaming(false);
    startRename(async () => {
      await renameMeal(meal.id, renameValue);
    });
  }

  function onOpenIconPicker(e: MouseEvent) {
    e.stopPropagation();
    setMenuOpen(false);
    setIconPickerOpen(true);
  }

  const onEmojiInput = useCallback(
    (e: React.FormEvent<HTMLInputElement>) => {
      const raw = e.currentTarget.value;
      const emoji = extractEmoji(raw);
      e.currentTarget.value = '';
      if (emoji) {
        setCurrentIcon(emoji);
        startIcon(async () => {
          await updateMealIcon(meal.id, emoji);
        });
      }
    },
    [meal.id],
  );

  return (
    <GlassCard
      className={cn(
        'cursor-pointer p-4 transition active:scale-[0.995]',
        menuOpen && 'relative z-30',
        expanded
          ? 'border-white/15'
          : 'border-white/10 shadow-[0_1px_0_rgba(255,255,255,0.06)_inset,0_8px_32px_-12px_rgba(0,0,0,0.4)] hover:border-white/20',
      )}
      onClick={() => {
        if (!renaming && !iconPickerOpen) setExpanded((v) => !v);
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 gap-3">
          <span
            className={cn(
              'relative mt-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px] border bg-white/[0.06] text-2xl leading-none transition select-none',
              iconPickerOpen
                ? 'border-[var(--accent)]/70 ring-2 ring-[var(--accent)]/25'
                : 'border-white/10',
              pendingIcon && 'opacity-50',
            )}
            onClick={(e) => {
              if (iconPickerOpen) e.stopPropagation();
            }}
          >
            {displayEmoji}
            {/* Transparent input overlaid on the emoji — focuses the native keyboard */}
            {iconPickerOpen ? (
              <input
                ref={emojiInputRef}
                type="text"
                onInput={onEmojiInput}
                onBlur={() => setIconPickerOpen(false)}
                onClick={(e) => e.stopPropagation()}
                className="absolute inset-0 cursor-pointer rounded-[15px] opacity-0"
              />
            ) : null}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium tracking-wider text-[var(--accent)] uppercase">
              {MEAL_TYPE_LABELS[meal.type]}
            </p>
            {renaming ? (
              <input
                ref={renameInputRef}
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={onRenameKeyDown}
                onBlur={commitRename}
                onClick={(e) => e.stopPropagation()}
                placeholder={MEAL_TYPE_LABELS[meal.type]}
                disabled={pendingRename}
                className="mt-0.5 w-full rounded-lg bg-white/10 px-2 py-0.5 text-sm font-semibold text-white outline-none placeholder:text-neutral-500 focus:ring-1 focus:ring-[var(--accent)]/60"
              />
            ) : meal.name ? (
              <h3 className="mt-0.5 line-clamp-2 text-sm font-semibold text-white">{meal.name}</h3>
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
                disabled={pendingDelete || pendingCopy}
                className="text-neutral-400 hover:text-white"
              >
                <MoreVertical size={18} />
              </IconButton>
              {menuOpen ? (
                <div className="absolute top-full right-0 z-20 mt-1 w-44 overflow-hidden rounded-2xl border border-white/10 bg-[#1a1633]/95 p-1 shadow-2xl backdrop-blur-xl">
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
                    onClick={onStartRename}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-white transition hover:bg-white/5"
                  >
                    <PenLine size={14} className="text-neutral-400" />
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={onOpenIconPicker}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-white transition hover:bg-white/5"
                  >
                    <Smile size={14} className="text-neutral-400" />
                    Change icon
                  </button>
                  <button
                    type="button"
                    onClick={onCopy}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-white transition hover:bg-white/5"
                  >
                    <Copy size={14} className="text-neutral-400" />
                    Copy to today
                  </button>
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

      {/* Expanded ingredient list */}
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
              {meal.entries.map((e) => {
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

      <div className="mt-4 flex justify-center">
        <span
          aria-hidden
          className={cn(
            'h-[5px] w-12 rounded-full transition-colors',
            expanded ? 'bg-white/15' : 'bg-white/25',
          )}
        />
      </div>
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
