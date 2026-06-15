import 'server-only';
import { getAnthropic, MODELS } from './anthropic';
import type { LibraryItem } from '@/components/IngredientPicker';
import {
  FREE_TEXT_ESTIMATION_SYSTEM,
  estimateMealTool,
  estimationResponseSchema,
  type EstimationResponse,
} from './freeTextEstimation';

/** Stable key for a library item, e.g. "p:clx123" / "r:clx456". */
function libraryKey(item: LibraryItem): string {
  return `${item.kind === 'product' ? 'p' : 'r'}:${item.id}`;
}

/** A compact, model-readable listing of the user's saved foods. */
function buildLibraryBlock(library: LibraryItem[]): string | null {
  if (library.length === 0) return null;
  const lines = library.map((item) => {
    const inUse = item.kind === 'product' && item.inUse ? ' [in use]' : '';
    const brand = item.kind === 'product' && item.brand ? ` (${item.brand})` : '';
    return `${libraryKey(item)} — ${item.name}${brand} · ${Math.round(item.kcalPer100g)} kcal, P${item.proteinPer100g.toFixed(
      1,
    )} C${item.carbsPer100g.toFixed(1)} F${item.fatPer100g.toFixed(1)} /100g${inUse}`;
  });
  return [
    "The user's saved foods (match a described food to one of these by name when",
    'it clearly fits, set its matchId, and use these exact macros; prefer [in use]',
    'when several match the same food):',
    ...lines,
  ].join('\n');
}

/**
 * Call Claude Sonnet with the structured tool and return a parsed
 * estimate. When `library` is given, the user's saved foods are offered to
 * the model so a described food can resolve to the user's own product/recipe
 * (exact macros + a productId/recipeId link). Throws on Claude-side failures.
 */
export async function estimateMealFromText(
  description: string,
  library: LibraryItem[] = [],
): Promise<EstimationResponse> {
  const client = getAnthropic();
  const libraryBlock = buildLibraryBlock(library);

  const response = await client.messages.create({
    model: MODELS.sonnet,
    max_tokens: 1024,
    temperature: 0.2,
    system: [
      {
        type: 'text',
        text: FREE_TEXT_ESTIMATION_SYSTEM,
        cache_control: { type: 'ephemeral' },
      },
      ...(libraryBlock ? [{ type: 'text' as const, text: libraryBlock }] : []),
    ],
    tools: [estimateMealTool],
    tool_choice: { type: 'tool', name: estimateMealTool.name },
    messages: [{ role: 'user', content: description }],
  });

  const toolCall = response.content.find(
    (b) => b.type === 'tool_use' && b.name === estimateMealTool.name,
  );
  if (!toolCall || toolCall.type !== 'tool_use') {
    throw new Error("Klara couldn't read that description.");
  }

  const parsed = estimationResponseSchema.safeParse(toolCall.input);
  if (!parsed.success) {
    throw new Error('Klara returned an estimate I could not parse.');
  }

  // Resolve any matched library item: override macros with the user's exact
  // values and link the entry to the product/recipe so the snapshot is right.
  const byKey = new Map(library.map((item) => [libraryKey(item), item]));
  const entries = parsed.data.entries.map((entry) => {
    const item = entry.matchId ? byKey.get(entry.matchId) : undefined;
    if (!item) {
      // No library match — keep the model's estimate, drop the transient matchId.
      return {
        name: entry.name,
        grams: entry.grams,
        kcalPer100g: entry.kcalPer100g,
        proteinPer100g: entry.proteinPer100g,
        carbsPer100g: entry.carbsPer100g,
        fatPer100g: entry.fatPer100g,
        productId: entry.productId,
        recipeId: entry.recipeId,
      };
    }
    return {
      name: entry.name,
      grams: entry.grams,
      kcalPer100g: item.kcalPer100g,
      proteinPer100g: item.proteinPer100g,
      carbsPer100g: item.carbsPer100g,
      fatPer100g: item.fatPer100g,
      productId: item.kind === 'product' ? item.id : undefined,
      recipeId: item.kind === 'recipe' ? item.id : undefined,
    };
  });

  return { ...parsed.data, entries };
}
