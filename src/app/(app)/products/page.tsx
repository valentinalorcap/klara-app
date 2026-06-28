import Link from 'next/link';
import { Plus, Package } from 'lucide-react';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { EmptyTab } from '@/components/EmptyTab';
import { ProductList } from '@/components/ProductList';

export default async function ProductsPage() {
  const session = await auth();
  const products = await prisma.product.findMany({
    where: { userId: session!.user.id },
    orderBy: { updatedAt: 'desc' },
  });

  return (
    <main className="px-4 py-10">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-white">Products</h1>
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
        <ProductList products={products} />
      )}
    </main>
  );
}
