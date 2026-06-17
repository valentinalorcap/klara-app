import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { ProductForm } from '@/components/ProductForm';
import { createProduct } from '../actions';

export default function NewProductPage() {
  return (
    <main className="px-6 py-10">
      <Link
        href="/products"
        className="-ml-2 inline-flex items-center gap-1 text-sm text-neutral-400 transition hover:text-neutral-200"
      >
        <ChevronLeft size={16} />
        Products
      </Link>

      <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">New product</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Add a photo of the nutrition label and Klara fills it in, or type the values yourself (per
        100g).
      </p>

      <div className="mt-8">
        <ProductForm action={createProduct} submitLabel="Create product" />
      </div>
    </main>
  );
}
