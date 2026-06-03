import Link from 'next/link';
import { Plus, ChefHat } from 'lucide-react';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { EmptyTab } from '@/components/EmptyTab';
import { GlassCard } from '@/components/GlassCard';
import { StaggerList, StaggerItem } from '@/components/StaggerList';

export default async function RecipesPage() {
  const session = await auth();
  const recipes = await prisma.recipe.findMany({
    where: { userId: session!.user.id },
    orderBy: { updatedAt: 'desc' },
  });

  return (
    <main className="px-6 py-10">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Recipes</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Your own dishes — macros computed from the ingredients.
          </p>
        </div>
        <Link
          href="/recipes/new"
          aria-label="Add recipe"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-[0_8px_24px_-8px_var(--accent-glow)] transition hover:bg-[var(--accent-hover)] active:scale-95"
        >
          <Plus size={20} />
        </Link>
      </header>

      {recipes.length === 0 ? (
        <div className="mt-10">
          <EmptyTab
            icon={ChefHat}
            title="No recipes yet"
            message="Add one — your banana bread, your granola — and Klara computes the macros per portion automatically."
          />
        </div>
      ) : (
        <StaggerList className="mt-8 space-y-3">
          {recipes.map((r) => {
            const kcalPerPortion = Math.round(r.totalKcal / r.portions);
            const proteinPerPortion = (r.totalProtein / r.portions).toFixed(1);
            const carbsPerPortion = (r.totalCarbs / r.portions).toFixed(1);
            const fatPerPortion = (r.totalFat / r.portions).toFixed(1);
            return (
              <StaggerItem key={r.id}>
                <Link href={`/recipes/${r.id}/edit`} className="block">
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
                        <p className="text-sm font-semibold text-white tabular-nums">
                          {kcalPerPortion} kcal
                        </p>
                        <p className="text-xs text-neutral-500">per portion</p>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-neutral-400 tabular-nums">
                      P {proteinPerPortion}g · C {carbsPerPortion}g · F {fatPerPortion}g
                    </p>
                  </GlassCard>
                </Link>
              </StaggerItem>
            );
          })}
        </StaggerList>
      )}
    </main>
  );
}
