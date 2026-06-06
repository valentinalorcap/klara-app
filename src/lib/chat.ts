import { EvalTone } from '@prisma/client';
import type { DailyTargets, MacroSum } from './evaluations';

/** A meal summary that's small enough to feed into the chat prompt. */
export type ChatMealSummary = {
  typeLabel: string;
  name: string | null;
  totals: MacroSum;
};

/** One day's roll-up for the "last 7 days" section. */
export type ChatDaySummary = {
  /** YYYY-MM-DD, in the user's local day. */
  date: string;
  totals: MacroSum;
  mealCount: number;
};

export type ChatContext = {
  user: {
    firstName: string;
    tone: EvalTone;
  };
  targets: DailyTargets;
  today: {
    date: string;
    totals: MacroSum;
    meals: ChatMealSummary[];
  };
  /** Most recent first. */
  recentDays: ChatDaySummary[];
};

function formatTarget(value: number | null | undefined, unit: string): string {
  return value == null ? '—' : `${Math.round(value)}${unit}`;
}

function formatMacro(value: number): string {
  return value.toFixed(1);
}

const TONE_GUIDANCE: Record<EvalTone, string> = {
  DIRECT: 'Keep your replies concise and matter-of-fact. No exclamation marks, no padding.',
  MOTIVATIONAL:
    'Be warm and encouraging. Celebrate small wins. Suggest next steps positively but never gratuitously.',
  NEUTRAL: 'Stay descriptive and clinical. Just facts and numbers, no second person rhetoric.',
};

/**
 * Build the stable system prefix — instructions, profile, tone. We
 * mark this block as cache_control: ephemeral on the Anthropic side so
 * repeat chat turns hit the prompt cache.
 */
export function buildChatSystemStable(ctx: ChatContext): string {
  return [
    "You are Klara, the user's personal nutrition coach in an ongoing chat.",
    'The user is logging meals in a companion app; the app feeds you their',
    'current day and a short rolling history every turn. Use it.',
    '',
    `User: ${ctx.user.firstName}.`,
    `Daily targets: ${formatTarget(ctx.targets.kcal, ' kcal')} · ${formatTarget(
      ctx.targets.protein,
      'g protein',
    )} · ${formatTarget(ctx.targets.carbs, 'g carbs')} · ${formatTarget(ctx.targets.fat, 'g fat')}.`,
    `Tone: ${ctx.user.tone}. ${TONE_GUIDANCE[ctx.user.tone]}`,
    '',
    'Rules:',
    '- Anchor on the numbers the app shows you, not on what the user describes.',
    "- Never tell the user to eat more of a macro they're already OVER on.",
    '- Only mention macros the user has a target for; skip the rest.',
    '- Plain text only — no markdown headers, no code fences. Short paragraphs.',
    '- Reply in English unless the user writes to you in another language.',
  ].join('\n');
}

/**
 * Build the dynamic section — today's state and the last 7 days. Goes
 * into a separate system block (not cached) so the cache hit on the
 * stable prefix survives across turns.
 */
export function buildChatSystemDynamic(ctx: ChatContext): string {
  const todayLines: string[] = [
    `Today (${ctx.today.date}):`,
    `  Totals so far: ${formatMacro(ctx.today.totals.protein)}g P · ${formatMacro(
      ctx.today.totals.carbs,
    )}g C · ${formatMacro(ctx.today.totals.fat)}g F · ${Math.round(ctx.today.totals.kcal)} kcal`,
  ];
  if (ctx.today.meals.length === 0) {
    todayLines.push('  (no meals logged yet today)');
  } else {
    todayLines.push('  Meals logged today:');
    for (const m of ctx.today.meals) {
      const label = m.name ? `${m.typeLabel} — ${m.name}` : m.typeLabel;
      todayLines.push(
        `  - ${label}: ${formatMacro(m.totals.protein)}g P · ${Math.round(m.totals.kcal)} kcal`,
      );
    }
  }

  const recentLines: string[] = ['', 'Last 7 days (most recent first):'];
  if (ctx.recentDays.length === 0) {
    recentLines.push('  (no history yet)');
  } else {
    for (const d of ctx.recentDays) {
      recentLines.push(
        `  - ${d.date}: ${formatMacro(d.totals.protein)}g P · ${Math.round(d.totals.kcal)} kcal across ${
          d.mealCount
        } ${d.mealCount === 1 ? 'meal' : 'meals'}`,
      );
    }
  }

  return [...todayLines, ...recentLines].join('\n');
}
