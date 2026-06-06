import { prisma } from '@/lib/prisma';
import { defaultPortionGrams, effectiveTotalGrams } from '@/lib/recipes';
import type { LibraryItem } from '@/components/IngredientPicker';
import type { FavoriteMeal } from '@/components/MealForm';

/**
 * Load the picker library (products + recipes) and the user's favorites.
 * Shared between /today/new, /today/batch, and /today/[id]/edit so the
 * data shape (and recipe per-100g normalization) stays in one place.
 */
export async function loadMealFormData(userId: string): Promise<{
  items: LibraryItem[];
  favoriteMeals: FavoriteMeal[];
}> {
  const [products, recipes, favorites] = await Promise.all([
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

  return { items, favoriteMeals };
}
