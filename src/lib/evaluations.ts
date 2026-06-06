import { EvalTone } from '@prisma/client';

/** UI labels for the tone selector. */
export const TONE_LABELS: Record<EvalTone, string> = {
  DIRECT: 'Direct',
  MOTIVATIONAL: 'Motivational',
  NEUTRAL: 'Neutral',
};

/** Short description shown under each radio option in Settings. */
export const TONE_DESCRIPTIONS: Record<EvalTone, string> = {
  DIRECT: 'Concise, no fluff. Like a coach who shoots straight.',
  MOTIVATIONAL: 'Warm and encouraging, celebrates wins, suggests next steps.',
  NEUTRAL: 'Descriptive and clinical, just the facts and numbers.',
};

/** Daily macro targets — any subset may be set. */
export type DailyTargets = {
  kcal?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
};

/** Sum of macros for a meal (or the day so far). */
export type MacroSum = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

/** A single ingredient with its computed macros (already multiplied by grams). */
export type EvalEntry = {
  name: string;
  grams: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type EvalMealSummary = {
  typeLabel: string;
  name: string | null;
  entries: EvalEntry[];
  totals: MacroSum;
};

export type EvaluationInput = {
  meal: EvalMealSummary;
  /** Other meals logged in the same batch session, in chronological order. */
  batchSiblings?: EvalMealSummary[];
  dayTotals: MacroSum;
  targets: DailyTargets;
  tone: EvalTone;
};

const TONE_GUIDANCE: Record<EvalTone, string> = {
  DIRECT: [
    'DIRECT tone: concise, no fluff, no exclamation marks. Like a coach',
    'who shoots straight. Example: "Solid protein hit (~32g). Cal a bit',
    'low — consider extra carbs in your next meal."',
  ].join(' '),
  MOTIVATIONAL: [
    'MOTIVATIONAL tone: warm and encouraging, celebrate small wins, suggest',
    'next steps positively. Friendly phrasing, light on punctuation drama.',
    'Example: "Great protein-rich start! 32g in one go. Plenty of room',
    'left in your cal budget for a hearty lunch."',
  ].join(' '),
  NEUTRAL: [
    'NEUTRAL tone: descriptive and clinical, no judgment, no second person.',
    'Just facts and numbers. Example: "This meal contributes 32g protein',
    'and 420 kcal, about 22% of the daily protein target."',
  ].join(' '),
};

/**
 * Build the stable system prompt — this is what we mark as cacheable on
 * the Anthropic side, so repeated evaluations for the same user reuse it.
 * Per-tone so we don't have to thread the choice through the user msg.
 */
export function buildSystemPrompt(tone: EvalTone): string {
  return [
    "You are Klara, the user's personal nutrition coach. After each meal they",
    'log, write ONE short evaluation (1–3 sentences, plain text, no bullets',
    'or headers) tailored to their daily goals.',
    '',
    TONE_GUIDANCE[tone],
    '',
    'Rules:',
    '- Always reference at least one specific number from the meal or day totals.',
    '- Only comment on macros the user has a target set for (others may be unset).',
    '- Never recommend skipping meals or extreme restriction.',
    '- Plain text only, no markdown formatting, no greeting, no sign-off.',
    '- Reply in English. Keep the meal/ingredient names as written.',
  ].join('\n');
}

function formatTarget(value: number | null | undefined, unit: string): string {
  return value == null ? '—' : `${Math.round(value)}${unit}`;
}

function formatMacro(value: number): string {
  return value.toFixed(1);
}

function describeMeal(meal: EvalMealSummary): string[] {
  const label = meal.name ? `${meal.typeLabel} — ${meal.name}` : meal.typeLabel;
  const entryLines = meal.entries.map((e) => {
    return `- ${e.name}: ${Math.round(e.grams)}g → P ${formatMacro(e.protein)}g, C ${formatMacro(
      e.carbs,
    )}g, F ${formatMacro(e.fat)}g, ${Math.round(e.kcal)} kcal`;
  });
  const totalsLine = `  Totals: ${formatMacro(meal.totals.protein)}g P · ${formatMacro(
    meal.totals.carbs,
  )}g C · ${formatMacro(meal.totals.fat)}g F · ${Math.round(meal.totals.kcal)} kcal`;
  return [`${label}:`, ...entryLines, totalsLine];
}

/**
 * Build the user message — fully dynamic per meal, never cached.
 * Lists ingredients with macros, the meal totals, day-so-far totals,
 * and the (possibly partial) daily targets. When `batchSiblings` is
 * present, frames the message as "batch of N" so Claude can comment
 * on the conjunto instead of one meal in isolation.
 */
export function buildUserMessage(input: EvaluationInput): string {
  const { meal, batchSiblings, dayTotals, targets } = input;
  const siblings = batchSiblings ?? [];
  const isBatch = siblings.length > 0;
  const batchTotal = siblings.length + 1;

  const targetsLine = `Daily targets: ${formatTarget(targets.kcal, ' kcal')} · ${formatTarget(
    targets.protein,
    'g protein',
  )} · ${formatTarget(targets.carbs, 'g carbs')} · ${formatTarget(targets.fat, 'g fat')}`;

  const dayLine = `Day so far (incl. ${
    isBatch ? 'the whole batch' : 'this meal'
  }): ${formatMacro(dayTotals.protein)}g P · ${formatMacro(dayTotals.carbs)}g C · ${formatMacro(
    dayTotals.fat,
  )}g F · ${Math.round(dayTotals.kcal)} kcal`;

  if (!isBatch) {
    return [
      `Meal logged:`,
      ...describeMeal(meal),
      '',
      dayLine,
      targetsLine,
      '',
      'Evaluate this meal.',
    ].join('\n');
  }

  const orderedBatch = [...siblings, meal];
  const sections = orderedBatch.flatMap((m, i) => [
    `Meal ${i + 1} of ${batchTotal}:`,
    ...describeMeal(m),
    '',
  ]);

  return [
    `Batch logged in one session — ${batchTotal} meals to evaluate together:`,
    '',
    ...sections,
    dayLine,
    targetsLine,
    '',
    'Evaluate the batch as a whole — comment on the combination, not each meal in isolation.',
  ].join('\n');
}
