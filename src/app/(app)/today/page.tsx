import { LogOut } from 'lucide-react';
import { auth, signOut } from '@/auth';
import { prisma } from '@/lib/prisma';
import { GlassCard } from '@/components/GlassCard';
import { MealSection } from '@/components/MealSection';
import type { LibraryItem } from '@/components/IngredientPicker';
import { MEAL_TYPE_ORDER, isoDate, sumEntries, recipePer100g } from '@/lib/meals';

export default async function TodayPage() {
  const session = await auth();
  const userId = session!.user.id;
  const firstName = session?.user?.name?.split(' ')[0] ?? 'friend';

  const dayKey = isoDate(new Date());
  const dayDate = new Date(dayKey + 'T00:00:00Z');

  const [meals, products, recipes] = await Promise.all([
    prisma.meal.findMany({
      where: { userId, date: dayDate },
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
  ]);

  // Flatten entries into a LibraryItem list for the picker.
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
    ...recipes.map((r): LibraryItem => {
      const totalGrams = r.ingredients.reduce((sum, i) => sum + i.grams, 0);
      const per100 = recipePer100g(
        {
          totalKcal: r.totalKcal,
          totalProtein: r.totalProtein,
          totalCarbs: r.totalCarbs,
          totalFat: r.totalFat,
        },
        totalGrams,
      );
      return {
        kind: 'recipe',
        id: r.id,
        name: r.name,
        ...per100,
      };
    }),
  ];

  const allEntries = meals.flatMap((m) => m.entries);
  const dayTotals = sumEntries(allEntries);

  const entriesByType = new Map<string, typeof allEntries>();
  for (const meal of meals) {
    const existing = entriesByType.get(meal.type) ?? [];
    entriesByType.set(meal.type, [...existing, ...meal.entries]);
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <main className="space-y-5 px-6 py-10">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-sm text-neutral-400">{today}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">Hi {firstName} 👋</h1>
        </div>
        <form
          action={async () => {
            'use server';
            await signOut({ redirectTo: '/login' });
          }}
        >
          <button
            type="submit"
            aria-label="Sign out"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-neutral-300 backdrop-blur-xl transition hover:bg-white/10"
          >
            <LogOut size={16} />
          </button>
        </form>
      </header>

      <GlassCard className="p-6">
        <p className="text-xs font-medium tracking-wider text-neutral-400 uppercase">
          Today so far
        </p>
        <p className="mt-2 text-4xl font-bold text-white tabular-nums">
          {Math.round(dayTotals.kcal)}{' '}
          <span className="text-base font-medium text-neutral-400">kcal</span>
        </p>
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <Stat label="Protein" value={dayTotals.protein.toFixed(1) + 'g'} />
          <Stat label="Carbs" value={dayTotals.carbs.toFixed(1) + 'g'} />
          <Stat label="Fat" value={dayTotals.fat.toFixed(1) + 'g'} />
        </div>
      </GlassCard>

      {MEAL_TYPE_ORDER.map((type) => (
        <MealSection
          key={type}
          type={type}
          entries={(entriesByType.get(type) ?? []).map((e) => ({
            id: e.id,
            name: e.name,
            grams: e.grams,
            kcalPer100g: e.kcalPer100g,
            proteinPer100g: e.proteinPer100g,
            carbsPer100g: e.carbsPer100g,
            fatPer100g: e.fatPer100g,
          }))}
          items={items}
        />
      ))}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-base font-semibold text-white tabular-nums">{value}</p>
      <p className="mt-0.5 text-[10px] tracking-wider text-neutral-500 uppercase">{label}</p>
    </div>
  );
}
