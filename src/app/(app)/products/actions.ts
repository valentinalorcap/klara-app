'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { productInputSchema } from '@/lib/products';
import { getAnthropic, MODELS } from '@/lib/anthropic';
import {
  extractedLabelSchema,
  labelExtractionTool,
  LABEL_EXTRACTION_PROMPT,
  type ExtractedLabel,
} from '@/lib/labelExtraction';

type FieldErrors = Partial<Record<keyof typeof productInputSchema.shape, string>>;

export type ProductFormState = {
  fieldErrors?: FieldErrors;
  formError?: string;
};

function parseForm(formData: FormData) {
  return productInputSchema.safeParse({
    name: formData.get('name'),
    brand: formData.get('brand'),
    kcalPer100g: formData.get('kcalPer100g'),
    proteinPer100g: formData.get('proteinPer100g'),
    carbsPer100g: formData.get('carbsPer100g'),
    fatPer100g: formData.get('fatPer100g'),
    suggestedPortionGrams: formData.get('suggestedPortionGrams'),
    icon: formData.get('icon'),
  });
}

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session.user.id;
}

function flattenFieldErrors(error: z.ZodError): FieldErrors {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === 'string' && !(key in out)) out[key] = issue.message;
  }
  return out as FieldErrors;
}

export async function createProduct(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const userId = await requireUserId();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { fieldErrors: flattenFieldErrors(parsed.error) };
  }
  await prisma.product.create({ data: { ...parsed.data, userId } });
  revalidatePath('/products');
  redirect('/products');
}

export async function updateProduct(
  productId: string,
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const userId = await requireUserId();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { fieldErrors: flattenFieldErrors(parsed.error) };
  }
  const existing = await prisma.product.findUnique({ where: { id: productId } });
  if (!existing || existing.userId !== userId) {
    return { formError: 'Producto no encontrado' };
  }
  await prisma.product.update({ where: { id: productId }, data: parsed.data });
  revalidatePath('/products');
  redirect('/products');
}

/** Flip the "currently using" marker on a product. */
export async function toggleProductInUse(productId: string) {
  const userId = await requireUserId();
  const existing = await prisma.product.findUnique({
    where: { id: productId },
    select: { userId: true, inUse: true },
  });
  if (!existing || existing.userId !== userId) return;
  // Raw update so `updatedAt` is NOT bumped — toggling in-use must not reorder
  // the list (which sorts by updatedAt). Editing a product still bumps it.
  await prisma.$executeRaw`UPDATE "Product" SET "inUse" = ${!existing.inUse} WHERE "id" = ${productId}`;
  revalidatePath('/products');
}

export async function deleteProduct(productId: string) {
  const userId = await requireUserId();
  const existing = await prisma.product.findUnique({ where: { id: productId } });
  if (!existing || existing.userId !== userId) return;
  await prisma.product.delete({ where: { id: productId } });
  revalidatePath('/products');
  redirect('/products');
}

/** Delete a product without redirecting — used by the list's swipe-to-delete
 *  so the row can animate out in place instead of navigating. */
export async function deleteProductInline(productId: string) {
  const userId = await requireUserId();
  const existing = await prisma.product.findUnique({
    where: { id: productId },
    select: { userId: true },
  });
  if (!existing || existing.userId !== userId) return;
  await prisma.product.delete({ where: { id: productId } });
  revalidatePath('/products');
}

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
 * Send a nutrition-label photo to Claude Sonnet (vision + tool use) and return
 * the extracted facts as structured data. The image itself is never stored —
 * only the parsed values, which prefill the product form for the user to edit.
 */
export async function extractFromLabel(formData: FormData): Promise<ExtractFromLabelResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'Not signed in.' };

  const file = formData.get('image');
  if (!(file instanceof File)) return { ok: false, error: 'No image was uploaded.' };
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
            { type: 'image', source: { type: 'base64', media_type: file.type, data: base64 } },
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
  if (!toolUse) return { ok: false, error: 'Could not read the label — try a clearer photo.' };

  const parsed = extractedLabelSchema.safeParse(toolUse.input);
  if (!parsed.success) {
    return { ok: false, error: 'Got values from the label but they look implausible.' };
  }
  return { ok: true, data: parsed.data };
}
