import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { LibraryTabs } from '@/components/LibraryTabs';
import { perPortion } from '@/lib/recipes';

export default async function LibraryPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [recipes, favorites] = await Promise.all([
    prisma.recipe.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.mealTemplate.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: { entries: { orderBy: { id: 'asc' } } },
    }),
  ]);

  const recipeItems = recipes.map((r) => ({
    id: r.id,
    name: r.name,
    portions: r.portions,
    pp: perPortion(
      {
        totalKcal: r.totalKcal,
        totalProtein: r.totalProtein,
        totalCarbs: r.totalCarbs,
        totalFat: r.totalFat,
      },
      r.portions,
    ),
  }));

  const favoriteItems = favorites.map((t) => ({
    id: t.id,
    type: t.type,
    name: t.name,
    icon: t.icon,
    entries: t.entries.map((e) => ({
      id: e.id,
      name: e.name,
      grams: e.grams,
      kcalPer100g: e.kcalPer100g,
      proteinPer100g: e.proteinPer100g,
      carbsPer100g: e.carbsPer100g,
      fatPer100g: e.fatPer100g,
    })),
  }));

  return (
    <main className="px-4 py-10">
      <LibraryTabs recipes={recipeItems} favorites={favoriteItems} />
    </main>
  );
}
