'use server';

import { auth } from '@/auth';
import { getAnthropic, MODELS } from '@/lib/anthropic';
import {
  extractedLabelSchema,
  labelExtractionTool,
  LABEL_EXTRACTION_PROMPT,
  type ExtractedLabel,
} from '@/lib/labelExtraction';

export type ExtractFromLabelResult =
  | { ok: true; data: ExtractedLabel }
  | { ok: false; error: string };

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // Anthropic vision limit

const ALLOWED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
type AllowedMediaType = (typeof ALLOWED_MEDIA_TYPES)[number];

function isAllowedMediaType(value: string): value is AllowedMediaType {
  return (ALLOWED_MEDIA_TYPES as readonly string[]).includes(value);
}

/**
 * Send the image to Claude Sonnet (vision + tool use) and return the
 * extracted nutrition facts as structured data. The image itself is
 * discarded — only the parsed values are persisted later when the user
 * confirms.
 */
export async function extractFromLabel(formData: FormData): Promise<ExtractFromLabelResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'Not signed in.' };

  const file = formData.get('image');
  if (!(file instanceof File)) {
    return { ok: false, error: 'No image was uploaded.' };
  }
  if (file.size === 0) return { ok: false, error: 'The image is empty.' };
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: 'The image is too large (max 5 MB).' };
  }
  if (!isAllowedMediaType(file.type)) {
    return { ok: false, error: 'Use a JPG, PNG, WEBP or GIF photo.' };
  }

  const base64 = Buffer.from(await file.arrayBuffer()).toString('base64');

  const anthropic = getAnthropic();

  let response;
  try {
    response = await anthropic.messages.create({
      model: MODELS.sonnet,
      max_tokens: 512,
      tools: [labelExtractionTool],
      tool_choice: { type: 'tool', name: labelExtractionTool.name },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: file.type, data: base64 },
            },
            { type: 'text', text: LABEL_EXTRACTION_PROMPT },
          ],
        },
      ],
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? `Claude failed: ${err.message}` : 'Claude failed.',
    };
  }

  const toolUse = response.content.find((block) => block.type === 'tool_use');
  if (!toolUse) {
    return { ok: false, error: 'Could not read the label — try a clearer photo.' };
  }

  const parsed = extractedLabelSchema.safeParse(toolUse.input);
  if (!parsed.success) {
    return { ok: false, error: 'Got values from the label but they look implausible.' };
  }

  return { ok: true, data: parsed.data };
}
