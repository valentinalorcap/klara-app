import Link from 'next/link';
import { Plus, Package } from 'lucide-react';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { EmptyTab } from '@/components/EmptyTab';
import { GlassCard } from '@/components/GlassCard';
import { StaggerList, StaggerItem } from '@/components/StaggerList';

export default async function ProductsPage() {
  const session = await auth();
  const products = await prisma.product.findMany({
    where: { userId: session!.user.id },
    orderBy: { updatedAt: 'desc' },
  });

  return (
    <main className="px-6 py-10">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Products</h1>
          <p className="mt-1 text-sm text-neutral-400">Your food library — macros per 100g.</p>
        </div>
        <Link
          href="/products/new"
          aria-label="Add product"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-[0_8px_24px_-8px_var(--accent-glow)] transition hover:bg-[var(--accent-hover)] active:scale-95"
        >
          <Plus size={20} />
        </Link>
      </header>

      {products.length === 0 ? (
        <div className="mt-10">
          <EmptyTab
            icon={Package}
            title="No products yet"
            message="Tap the + button to add your first one — your yogurt, your protein powder, your favorite sauce."
          />
        </div>
      ) : (
        <StaggerList className="mt-8 space-y-3">
          {products.map((p) => (
            <StaggerItem key={p.id}>
              <Link href={`/products/${p.id}/edit`} className="block">
                <GlassCard
                  noAnimate
                  className="p-4 transition hover:border-white/20 active:scale-[0.99]"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{p.name}</p>
                      {p.brand ? (
                        <p className="truncate text-xs text-neutral-400">{p.brand}</p>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-white tabular-nums">
                        {Math.round(p.kcalPer100g)} kcal
                      </p>
                      <p className="text-xs text-neutral-500">per 100g</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-neutral-400 tabular-nums">
                    P {p.proteinPer100g.toFixed(1)}g · C {p.carbsPer100g.toFixed(1)}g · F{' '}
                    {p.fatPer100g.toFixed(1)}g
                  </p>
                </GlassCard>
              </Link>
            </StaggerItem>
          ))}
        </StaggerList>
      )}
    </main>
  );
}
