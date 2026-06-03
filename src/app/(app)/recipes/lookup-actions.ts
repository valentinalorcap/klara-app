'use server';

import { auth } from '@/auth';
import { getAnthropic, MODELS } from '@/lib/anthropic';
import {
  ingredientLookupSchema,
  ingredientLookupTool,
  INGREDIENT_LOOKUP_SYSTEM,
  type IngredientLookup,
} from '@/lib/ingredientLookup';

export type SuggestIngredientResult =
  | { ok: true; data: IngredientLookup }
  | { ok: false; error: string };

/**
 * Ask Claude Haiku for typical per-100g macros for a generic food name.
 * Used by the recipe form when the user's typed ingredient doesn't match
 * any product in their library.
 */
export async function suggestIngredientMacros(name: string): Promise<SuggestIngredientResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'Not signed in.' };

  const cleaned = name.trim();
  if (cleaned.length < 2) return { ok: false, error: 'Type at least two characters.' };
  if (cleaned.length > 120) return { ok: false, error: 'That name is too long.' };

  const anthropic = getAnthropic();

  let response;
  try {
    response = await anthropic.messages.create({
      model: MODELS.haiku,
      max_tokens: 256,
      system: INGREDIENT_LOOKUP_SYSTEM,
      tools: [ingredientLookupTool],
      tool_choice: { type: 'tool', name: ingredientLookupTool.name },
      messages: [{ role: 'user', content: cleaned }],
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? `Claude failed: ${err.message}` : 'Claude failed.',
    };
  }

  const toolUse = response.content.find((block) => block.type === 'tool_use');
  if (!toolUse) {
    return { ok: false, error: `Klara doesn't recognize "${cleaned}" — try a different name.` };
  }

  const parsed = ingredientLookupSchema.safeParse(toolUse.input);
  if (!parsed.success) {
    return { ok: false, error: 'Got macros back but they look implausible.' };
  }

  return { ok: true, data: parsed.data };
}
