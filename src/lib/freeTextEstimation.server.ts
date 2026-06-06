import 'server-only';
import { getAnthropic, MODELS } from './anthropic';
import {
  FREE_TEXT_ESTIMATION_SYSTEM,
  estimateMealTool,
  estimationResponseSchema,
  type EstimationResponse,
} from './freeTextEstimation';

/**
 * Call Claude Sonnet with the structured tool and return a parsed
 * estimate. Throws on Claude-side failures (no tool call, parse error,
 * etc.) — the server action wraps the throw into an `EstimationResult`.
 */
export async function estimateMealFromText(description: string): Promise<EstimationResponse> {
  const client = getAnthropic();

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

  return parsed.data;
}
