'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { productInputSchema } from '@/lib/products';

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
  await prisma.product.update({
    where: { id: productId },
    data: { inUse: !existing.inUse },
  });
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
