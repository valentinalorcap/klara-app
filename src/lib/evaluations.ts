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
    'DIRECT tone: blunt, no fluff, no exclamation marks. Name what needs fixing',
    'and what to do about it. Reference actual meal names from the history when',
    'relevant. Example: "Protein too low — add a chicken rice bowl like Tuesday."',
  ].join(' '),
  MOTIVATIONAL: [
    'MOTIVATIONAL tone: warm and encouraging. Celebrate a specific win (name the',
    'meal), then give one concrete next step. Reference their history to show you',
    'know them. Example: "That yogurt bowl was a great start! Repeat yesterday\'s',
    'dinner and you\'ll nail the day."',
  ].join(' '),
  NEUTRAL: [
    'NEUTRAL tone: honest, no emotional framing. State what the day needs and',
    'what specific meal would close the gap. No praise, no scolding.',
  ].join(' '),
};

/**
 * Build the stable system prompt — this is what we mark as cacheable on
 * the Anthropic side, so repeated evaluations for the same user reuse it.
 * Per-tone so we don't have to thread the choice through the user msg.
 */
export function buildSystemPrompt(tone: EvalTone): string {
  return [
    "You are Klara, the user's personal nutrition coach. After each meal they log,",
    'write a short evaluation.',
    '',
    'CRITICAL — read this before writing:',
    '1. The user sees their macro rings. NEVER narrate numbers back at them.',
    '2. Use the meal history to spot structural patterns — not to name dishes.',
    '3. The Day status tags (OVER / UNDER / ON-TRACK / UNSET) help you REASON.',
    '   Translate to behavior in your output — never write macro talk:',
    '   Good: "the afternoon is still empty" / "everything landed in one sitting".',
    '   Bad: "protein is under target" / "fat ran ahead".',
    '   Never suggest more of an OVER macro. Never mention an UNSET macro.',
    '',
    TONE_GUIDANCE[tone],
    '',
    'Output format — use EXACTLY this structure:',
    '',
    '👀 [where the day stands structurally — 1 sentence]',
    '🎯 [what to do next — 1 sentence about a meal slot or habit]',
    '',
    'Max 40 words total. Plain text only. No greeting, no sign-off.',
    'Never recommend skipping meals or extreme restriction.',
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
