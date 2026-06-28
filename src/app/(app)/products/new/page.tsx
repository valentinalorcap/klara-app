import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { ProductForm } from '@/components/ProductForm';
import { createProduct } from '../actions';

export default function NewProductPage() {
  return (
    <main className="px-4 py-10">
      <Link
        href="/products"
        className="-ml-2 inline-flex items-center gap-1 text-sm text-neutral-400 transition hover:text-neutral-200"
      >
        <ChevronLeft size={16} />
        Products
      </Link>

      <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">New product</h1>

      <div className="mt-8">
        <ProductForm action={createProduct} submitLabel="Create product" />
      </div>
    </main>
  );
}
