import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { MealForm, type FavoriteMeal, type MealInitialValues } from '@/components/MealForm';
import type { LibraryItem } from '@/components/IngredientPicker';
import { effectiveTotalGrams, defaultPortionGrams } from '@/lib/recipes';

export default async function EditMealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const [meal, products, recipes, favorites] = await Promise.all([
    prisma.meal.findUnique({
      where: { id },
      include: { entries: { orderBy: { createdAt: 'asc' } } },
    }),
    prisma.product.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        brand: true,
        kcalPer100g: true,
        proteinPer100g: true,
        carbsPer100g: true,
        fatPer100g: true,
      },
    }),
    prisma.recipe.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
      include: { ingredients: { select: { grams: true } } },
    }),
    prisma.mealTemplate.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: { entries: true },
    }),
  ]);

  if (!meal || meal.userId !== userId) notFound();

  const items: LibraryItem[] = [
    ...products.map(
      (p): LibraryItem => ({
        kind: 'product',
        id: p.id,
        name: p.name,
        brand: p.brand,
        kcalPer100g: p.kcalPer100g,
        proteinPer100g: p.proteinPer100g,
        carbsPer100g: p.carbsPer100g,
        fatPer100g: p.fatPer100g,
      }),
    ),
    ...recipes.map((r): LibraryItem & { defaultGrams: number } => {
      const ingredientSumGrams = r.ingredients.reduce((s, i) => s + i.grams, 0);
      const denom = effectiveTotalGrams({
        totalGrams: r.totalGrams,
        ingredientSumGrams,
      });
      const factor = denom > 0 ? 100 / denom : 0;
      return {
        kind: 'recipe',
        id: r.id,
        name: r.name,
        kcalPer100g: r.totalKcal * factor,
        proteinPer100g: r.totalProtein * factor,
        carbsPer100g: r.totalCarbs * factor,
        fatPer100g: r.totalFat * factor,
        defaultGrams: defaultPortionGrams({
          suggestedPortionGrams: r.suggestedPortionGrams,
          totalGrams: r.totalGrams,
          portions: r.portions,
          ingredientSumGrams,
        }),
      };
    }),
  ];

  const favoriteMeals: FavoriteMeal[] = favorites.map((f) => ({
    id: f.id,
    type: f.type,
    name: f.name,
    entries: f.entries.map((e) => ({
      name: e.name,
      grams: e.grams,
      productId: e.productId,
      recipeId: e.recipeId,
      kcalPer100g: e.kcalPer100g,
      proteinPer100g: e.proteinPer100g,
      carbsPer100g: e.carbsPer100g,
      fatPer100g: e.fatPer100g,
    })),
  }));

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
        <MealForm items={items} favorites={favoriteMeals} initial={initial} />
      </div>
    </main>
  );
}
