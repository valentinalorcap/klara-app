import Link from 'next/link';
import { Plus, ChefHat, Star } from 'lucide-react';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { GlassCard } from '@/components/GlassCard';
import { FavoriteTemplateCard } from '@/components/FavoriteTemplateCard';
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

  return (
    <main className="space-y-6 px-6 py-10">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-white">Library</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Your recipes and favorite meals, ready to reuse.
        </p>
      </header>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-medium tracking-wider text-neutral-400 uppercase">Recipes</h2>
          <Link
            href="/library/recipes/new"
            aria-label="Add recipe"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-[0_8px_24px_-8px_var(--accent-glow)] transition hover:bg-[var(--accent-hover)] active:scale-95"
          >
            <Plus size={16} />
          </Link>
        </div>

        {recipes.length === 0 ? (
          <GlassCard className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-neutral-400">
              <ChefHat size={16} />
            </div>
            <p className="text-xs text-neutral-400">
              No recipes yet. Tap + to add your banana bread, granola, or whatever you cook on
              repeat.
            </p>
          </GlassCard>
        ) : (
          <ul className="space-y-2">
            {recipes.map((r) => {
              const pp = perPortion(
                {
                  totalKcal: r.totalKcal,
                  totalProtein: r.totalProtein,
                  totalCarbs: r.totalCarbs,
                  totalFat: r.totalFat,
                },
                r.portions,
              );
              return (
                <li key={r.id}>
                  <Link href={`/library/recipes/${r.id}/edit`} className="block">
                    <GlassCard
                      noAnimate
                      className="p-4 transition hover:border-white/20 active:scale-[0.99]"
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">{r.name}</p>
                          <p className="truncate text-xs text-neutral-400">
                            {r.portions} portion{r.portions === 1 ? '' : 's'}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold text-[var(--macro-kcal)] tabular-nums">
                            {Math.round(pp.kcal)} kcal
                          </p>
                          <p className="text-xs text-neutral-500">per portion</p>
                        </div>
                      </div>
                      <p className="mt-3 text-xs tabular-nums">
                        <span className="text-[var(--macro-protein)]">
                          P {pp.protein.toFixed(1)}g
                        </span>
                        <span className="mx-1.5 text-neutral-500">·</span>
                        <span className="text-[var(--macro-carbs)]">C {pp.carbs.toFixed(1)}g</span>
                        <span className="mx-1.5 text-neutral-500">·</span>
                        <span className="text-[var(--macro-fat)]">F {pp.fat.toFixed(1)}g</span>
                      </p>
                    </GlassCard>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-medium tracking-wider text-neutral-400 uppercase">
          Favorite meals
        </h2>

        {favorites.length === 0 ? (
          <GlassCard className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-yellow-400">
              <Star size={16} />
            </div>
            <p className="text-xs text-neutral-400">
              Tap the star on a meal you logged to save it here for one-tap reuse.
            </p>
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {favorites.map((t) => (
              <FavoriteTemplateCard
                key={t.id}
                template={{
                  id: t.id,
                  type: t.type,
                  name: t.name,
                  entries: t.entries.map((e) => ({
                    id: e.id,
                    name: e.name,
                    grams: e.grams,
                    kcalPer100g: e.kcalPer100g,
                    proteinPer100g: e.proteinPer100g,
                    carbsPer100g: e.carbsPer100g,
                    fatPer100g: e.fatPer100g,
                  })),
                }}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
