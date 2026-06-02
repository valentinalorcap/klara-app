import Link from 'next/link';
import { Plus, Package } from 'lucide-react';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { EmptyTab } from '@/components/EmptyTab';

export default async function ProductsPage() {
  const session = await auth();
  const products = await prisma.product.findMany({
    where: { userId: session!.user.id },
    orderBy: { updatedAt: 'desc' },
  });

  return (
    <main className="px-6 py-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Productos</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Tu biblioteca de alimentos con macros por 100g.
          </p>
        </div>
        <Link
          href="/products/new"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900 text-white transition hover:bg-neutral-800"
          aria-label="Crear producto"
        >
          <Plus size={20} />
        </Link>
      </header>

      {products.length === 0 ? (
        <div className="mt-12">
          <EmptyTab
            icon={Package}
            title="Aún no tienes productos"
            message="Crea el primero con el botón + arriba a la derecha. Por ejemplo, tu yogur skyr o tu salsa chipotle."
          />
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {products.map((p) => (
            <li key={p.id}>
              <Link
                href={`/products/${p.id}/edit`}
                className="block rounded-xl border border-neutral-200 bg-white p-4 transition hover:border-neutral-300"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-neutral-900">{p.name}</p>
                    {p.brand ? (
                      <p className="truncate text-xs text-neutral-500">{p.brand}</p>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-neutral-900 tabular-nums">
                      {Math.round(p.kcalPer100g)} kcal
                    </p>
                    <p className="text-xs text-neutral-500">por 100g</p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-neutral-500 tabular-nums">
                  P {p.proteinPer100g.toFixed(1)}g · C {p.carbsPer100g.toFixed(1)}g · G{' '}
                  {p.fatPer100g.toFixed(1)}g
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
