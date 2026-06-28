import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { EditFavoriteForm } from '@/components/EditFavoriteForm';
import { loadMealFormData } from '@/app/(app)/today/_data';
import type { MealInitialValues } from '@/components/MealForm';

export default async function EditFavoritePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const [template, formData] = await Promise.all([
    prisma.mealTemplate.findUnique({
      where: { id },
      include: { entries: { orderBy: { id: 'asc' } } },
    }),
    loadMealFormData(userId),
  ]);

  if (!template || template.userId !== userId) notFound();

  const initial: MealInitialValues = {
    type: template.type,
    name: template.name,
    entries: template.entries.map((e) => ({
      name: e.name,
      grams: e.grams,
      productId: e.productId,
      recipeId: e.recipeId,
      kcalPer100g: e.kcalPer100g,
      proteinPer100g: e.proteinPer100g,
      carbsPer100g: e.carbsPer100g,
      fatPer100g: e.fatPer100g,
    })),
  };

  return (
    <main className="px-4 py-10">
      <Link
        href="/library"
        className="-ml-2 inline-flex items-center gap-1 text-sm text-neutral-400 transition hover:text-neutral-200"
      >
        <ChevronLeft size={16} />
        Back
      </Link>

      <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">Edit favorite</h1>

      <div className="mt-8">
        <EditFavoriteForm
          templateId={id}
          initial={initial}
          items={formData.items}
          favorites={formData.favoriteMeals}
        />
      </div>
    </main>
  );
}
