import 'server-only';
import { getAnthropic, MODELS } from '@/lib/anthropic';
import { prisma } from '@/lib/prisma';

const NAME_SYSTEM = [
  'You write a very short label for a logged meal from its ingredient list.',
  'Pick the 1-3 most defining ingredients (by prominence / quantity) and join',
  "them with ' - '. Keep it as short as possible.",
  '',
  'Rules:',
  '- Lowercase. Use the language of the ingredient names (usually Spanish).',
  "- Separator is ' - ' (space-hyphen-space). No other punctuation.",
  '- No quotes, no leading/trailing words, no explanation — output ONLY the name.',
  "- Examples: 'pan - huevos - queso', 'yogurt - frutas', 'pollo - arroz'.",
].join('\n');

/** Normalize the model output into a clean, short, lowercase label. */
function cleanName(raw: string): string {
  const firstLine = raw.trim().split('\n')[0] ?? '';
  return firstLine
    .replace(/^["'`]+|["'`]+$/g, '') // strip wrapping quotes
    .replace(/[.;]+$/g, '') // strip trailing punctuation
    .trim()
    .toLowerCase()
    .slice(0, 60);
}

/**
 * Auto-name a meal from its ingredients with Haiku, in the background.
 * No-op when the meal already has a name (e.g. it came from a favorite) or
 * has no ingredients. Failures are swallowed — a missing name is harmless.
 */
export async function generateMealName(mealId: string): Promise<void> {
  const meal = await prisma.meal.findUnique({
    where: { id: mealId },
    select: { name: true, entries: { select: { name: true, grams: true } } },
  });
  if (!meal || meal.entries.length === 0) return;
  if (meal.name && meal.name.trim()) return;

  const list = meal.entries.map((e) => `${e.name} (${Math.round(e.grams)}g)`).join(', ');

  try {
    const client = getAnthropic();
    const res = await client.messages.create({
      model: MODELS.haiku,
      max_tokens: 24,
      temperature: 0.3,
      system: NAME_SYSTEM,
      messages: [{ role: 'user', content: `Ingredients: ${list}\nName:` }],
    });
    const text = res.content.find((b) => b.type === 'text')?.text ?? '';
    const name = cleanName(text);
    if (name) {
      await prisma.meal.update({ where: { id: mealId }, data: { name } });
    }
  } catch {
    // Naming is best-effort; leave the meal nameless on failure.
  }
}
