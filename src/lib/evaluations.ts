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

export const TONE_GUIDANCE: Record<EvalTone, string> = {
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
    'or headers).',
    '',
    'How to write the evaluation — read carefully, this matters:',
    '',
    '1. THE DAY STATUS BLOCK IS THE PRIMARY SIGNAL. The user message starts',
    '   with a Day status block showing actual vs target for each macro,',
    '   tagged OVER / UNDER / ON-TRACK / UNSET. Anchor your evaluation to',
    '   that block first — the meal/batch description is context, not the',
    '   subject of your comment.',
    '',
    '2. If a macro is OVER target, acknowledge the overage. NEVER suggest',
    '   the user needs more of an OVER macro. NEVER tell them to add carbs',
    '   when carbs are OVER. Same for protein, fat, and calories.',
    '',
    '3. If a macro is UNDER target, you may point out the gap and suggest',
    '   ways to close it in remaining meals.',
    '',
    '4. If a macro is UNSET, do not mention it.',
    '',
    '5. The recently logged meal/batch is the trigger for the evaluation,',
    '   not the subject. Mention what was just logged briefly (one number),',
    '   but focus the take on where the day stands.',
    '',
    TONE_GUIDANCE[tone],
    '',
    'Output rules:',
    '- Plain text only, no markdown, no greeting, no sign-off.',
    '- Reply in English. Keep meal/ingredient names as written.',
    '- 1–3 sentences. Be specific with numbers.',
    '- Never recommend skipping meals or extreme restriction.',
  ].join('\n');
}

function formatMacro(value: number): string {
  return value.toFixed(1);
}

/**
 * One line per macro showing actual vs target with an explicit tag so
 * Claude can't miss whether the user is over/under. Macros without a
 * target render as UNSET (and the system prompt tells the model to skip
 * those).
 */
function buildDayStatusBlock(dayTotals: MacroSum, targets: DailyTargets): string[] {
  const rows: Array<{
    label: string;
    actual: number;
    target: number | null | undefined;
    unit: string;
  }> = [
    { label: 'Calories', actual: dayTotals.kcal, target: targets.kcal, unit: ' kcal' },
    { label: 'Protein', actual: dayTotals.protein, target: targets.protein, unit: 'g' },
    { label: 'Carbs', actual: dayTotals.carbs, target: targets.carbs, unit: 'g' },
    { label: 'Fat', actual: dayTotals.fat, target: targets.fat, unit: 'g' },
  ];
  return rows.map(({ label, actual, target, unit }) => {
    if (target == null || target <= 0) {
      return `- ${label}: ${formatMacro(actual)}${unit} consumed today (target UNSET — do not mention)`;
    }
    const pct = Math.round((actual / target) * 100);
    let tag: string;
    if (pct >= 110) tag = 'OVER';
    else if (pct <= 90) tag = 'UNDER';
    else tag = 'ON-TRACK';
    return `- ${label}: ${formatMacro(actual)}${unit} / ${Math.round(target)}${unit} target (${pct}% — ${tag})`;
  });
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
 * Leads with the Day status block (actual vs target + OVER/UNDER tags)
 * so Claude anchors the take on the day, then describes what was just
 * logged as context. When `batchSiblings` is present, frames the trigger
 * as "batch of N" so the comment is about the conjunto.
 */
export function buildUserMessage(input: EvaluationInput): string {
  const { meal, batchSiblings, dayTotals, targets } = input;
  const siblings = batchSiblings ?? [];
  const isBatch = siblings.length > 0;
  const batchTotal = siblings.length + 1;

  const statusBlock = buildDayStatusBlock(dayTotals, targets);

  const trigger = isBatch
    ? `Just logged: a batch of ${batchTotal} meals in one session (included in the day totals above).`
    : 'Just logged (already included in the day totals above):';

  const triggerDetails: string[] = isBatch
    ? [...siblings, meal].flatMap((m, i) => [
        `Meal ${i + 1} of ${batchTotal}:`,
        ...describeMeal(m),
        '',
      ])
    : describeMeal(meal);

  const instruction = isBatch
    ? 'Write the take based on the Day status block first; reference the batch only as context.'
    : 'Write the take based on the Day status block first; reference the meal only as context.';

  return [
    'Day status (this is what to anchor the evaluation on):',
    ...statusBlock,
    '',
    trigger,
    ...triggerDetails,
    '',
    instruction,
  ].join('\n');
}
