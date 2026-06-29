'use client';

import { useState, useTransition, useRef, useEffect, useCallback, type MouseEvent } from 'react';
import { flushSync } from 'react-dom';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Star,
  MoreVertical,
  Pencil,
  PenLine,
  Copy,
  Smile,
  Sunrise,
  Dumbbell,
  Sandwich,
  Cookie,
  Moon,
  Utensils,
  type LucideIcon,
} from 'lucide-react';
import { GlassCard } from './GlassCard';
import {
  renameFavorite,
  updateFavoriteIcon,
  addFavoriteToToday,
  removeFavorite,
} from '@/app/(app)/today/actions';
import { MEAL_TYPE_LABELS, type MealType, entryMacros, sumEntries } from '@/lib/meals';
import { mealDefaultEmoji, extractEmoji } from '@/lib/mealEmoji';
import { useToast } from './Toast';
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
    icon: string | null;
    entries: FavoriteTemplateEntry[];
  };
}) {
  const TypeIcon = MEAL_TYPE_ICONS[template.type];
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(template.name ?? '');
  const [pendingRename, startRename] = useTransition();
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [currentIcon, setCurrentIcon] = useState(template.icon);
  const [pendingAdd, startAdd] = useTransition();
  const [pendingIcon, startIcon] = useTransition();
  const [pendingRemove, startRemove] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const emojiInputRef = useRef<HTMLInputElement>(null);
  const { show } = useToast();
  const totals = sumEntries(template.entries);

  const displayEmoji = currentIcon ?? mealDefaultEmoji(template);

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

  function onStartRename(e: MouseEvent) {
    e.stopPropagation();
    setMenuOpen(false);
    setRenameValue(template.name ?? '');
    setRenaming(true);
  }

  function onRenameKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') commitRename();
    if (e.key === 'Escape') setRenaming(false);
  }

  function commitRename() {
    setRenaming(false);
    const trimmed = renameValue.trim();
    if (trimmed === (template.name ?? '')) return;
    startRename(async () => {
      await renameFavorite(template.id, trimmed);
    });
  }

  function onOpenIconPicker(e: MouseEvent) {
    e.stopPropagation();
    setMenuOpen(false);
    // iOS Safari only opens the keyboard when focus() runs synchronously
    // inside the tap handler. Flush the input into the DOM first, then focus
    // it right away — a focus() from a later effect is ignored on iOS.
    flushSync(() => setIconPickerOpen(true));
    emojiInputRef.current?.focus();
  }

  const onEmojiInput = useCallback(
    (e: React.FormEvent<HTMLInputElement>) => {
      const raw = e.currentTarget.value;
      const emoji = extractEmoji(raw);
      e.currentTarget.value = '';
      if (emoji) {
        setCurrentIcon(emoji);
        startIcon(async () => {
          await updateFavoriteIcon(template.id, emoji);
        });
      }
    },
    [template.id],
  );

  // Library-only: tapping the star removes the favorite. Always confirm first,
  // since here the star is the favorite itself (in Today it just toggles a link).
  function onUnfavorite(e: MouseEvent) {
    e.stopPropagation();
    const label = template.name ?? MEAL_TYPE_LABELS[template.type];
    if (!confirm(`Remove "${label}" from favorites?`)) return;
    startRemove(async () => {
      const result = await removeFavorite(template.id);
      if (result && !result.ok) window.alert(result.error);
    });
  }

  function onAddToToday(e: MouseEvent) {
    e.stopPropagation();
    setMenuOpen(false);
    startAdd(async () => {
      const result = await addFavoriteToToday(template.id);
      if (result && !result.ok) {
        window.alert(result.error);
        return;
      }
      show('Added to today');
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
            <p className="flex items-center gap-1 text-[10px] font-medium tracking-wider text-[var(--accent-text)] uppercase">
              <TypeIcon size={11} />
              {MEAL_TYPE_LABELS[template.type]}
            </p>
            {renaming ? (
              <input
                ref={renameInputRef}
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={onRenameKeyDown}
                onBlur={commitRename}
                onClick={(e) => e.stopPropagation()}
                placeholder={MEAL_TYPE_LABELS[template.type]}
                disabled={pendingRename}
                className="mt-0.5 w-full rounded-lg bg-white/10 px-2 py-0.5 text-sm font-semibold text-white outline-none placeholder:text-neutral-500 focus:ring-1 focus:ring-[var(--accent)]/60"
              />
            ) : template.name ? (
              <h2
                className={cn(
                  'mt-0.5 line-clamp-2 text-sm font-semibold text-white',
                  pendingRename && 'opacity-50',
                )}
              >
                {template.name}
              </h2>
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
          <button
            type="button"
            aria-label="Remove from favorites"
            onClick={onUnfavorite}
            disabled={pendingRemove}
            className="flex h-8 w-8 items-center justify-center text-yellow-400 transition hover:text-yellow-300 disabled:opacity-30"
          >
            <Star size={16} fill="currentColor" />
          </button>
          <div ref={menuRef} className="relative">
            <button
              type="button"
              aria-label="More actions"
              onClick={onMenuToggle}
              disabled={pendingAdd}
              className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition hover:text-white disabled:opacity-30"
            >
              <MoreVertical size={18} />
            </button>
            {menuOpen ? (
              <div className="absolute top-full right-0 z-20 mt-1 w-44 overflow-hidden rounded-2xl border border-white/10 bg-[#1a1633]/95 p-1 shadow-2xl backdrop-blur-xl">
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
                  onClick={onAddToToday}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-white transition hover:bg-white/5"
                >
                  <Copy size={14} className="text-neutral-400" />
                  Add to today
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
                  onClick={onStartRename}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-white transition hover:bg-white/5"
                >
                  <PenLine size={14} className="text-neutral-400" />
                  Rename
                </button>
              </div>
            ) : null}
          </div>
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
