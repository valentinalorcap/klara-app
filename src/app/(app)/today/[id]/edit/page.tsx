import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { MealForm, type MealInitialValues } from '@/components/MealForm';
import { loadMealFormData } from '@/app/(app)/today/_data';

export default async function EditMealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const [meal, formData] = await Promise.all([
    prisma.meal.findUnique({
      where: { id },
      include: { entries: { orderBy: { createdAt: 'asc' } } },
    }),
    loadMealFormData(userId),
  ]);

  if (!meal || meal.userId !== userId) notFound();

  const initial: MealInitialValues = {
    mealId: meal.id,
    type: meal.type,
    name: meal.name,
    entries: meal.entries.map((e) => ({
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
    <main className="px-6 py-10">
      <Link
        href="/today"
        className="-ml-2 inline-flex items-center gap-1 text-sm text-neutral-400 transition hover:text-neutral-200"
      >
        <ChevronLeft size={16} />
        Today
      </Link>

      <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">Edit meal</h1>

      <div className="mt-8">
        <MealForm items={formData.items} favorites={formData.favoriteMeals} initial={initial} />
      </div>
    </main>
  );
}
