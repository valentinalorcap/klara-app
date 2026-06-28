import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { RecipeForm } from '@/components/RecipeForm';
import { createRecipe } from '../actions';

export default async function NewRecipePage() {
  const session = await auth();
  const products = await prisma.product.findMany({
    where: { userId: session!.user.id },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      brand: true,
      kcalPer100g: true,
      proteinPer100g: true,
      carbsPer100g: true,
      fatPer100g: true,
      suggestedPortionGrams: true,
      inUse: true,
    },
  });

  return (
    <main className="px-4 py-10">
      <Link
        href="/library"
        className="-ml-2 inline-flex items-center gap-1 text-sm text-neutral-400 transition hover:text-neutral-200"
      >
        <ChevronLeft size={16} />
        Library
      </Link>

      <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">New recipe</h1>

      <div className="mt-8">
        <RecipeForm action={createRecipe} products={products} submitLabel="Create recipe" />
      </div>
    </main>
  );
}
