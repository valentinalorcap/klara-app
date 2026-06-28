import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { MealForm, type MealInitialValues } from '@/components/MealForm';
import { loadMealFormData } from '@/app/(app)/today/_data';
import { utcDateKey } from '@/lib/history';

export default async function EditMealPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const { from } = await searchParams;
  const backTo = typeof from === 'string' ? from : '/today';
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
    // Preserve the meal's own day so saving never moves it to today (KLA-002).
    date: utcDateKey(meal.date),
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
    <main className="px-4 py-10">
      <Link
        href={backTo}
        className="-ml-2 inline-flex items-center gap-1 text-sm text-neutral-400 transition hover:text-neutral-200"
      >
        <ChevronLeft size={16} />
        Back
      </Link>

      <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">Edit meal</h1>

      <div className="mt-8">
        <MealForm
          items={formData.items}
          favorites={formData.favoriteMeals}
          initial={initial}
          returnTo={backTo}
        />
      </div>
    </main>
  );
}
