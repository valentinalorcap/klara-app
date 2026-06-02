import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { ProductForm } from '@/components/ProductForm';
import { createProduct } from '../actions';

export default function NewProductPage() {
  return (
    <main className="px-6 py-8">
      <Link
        href="/products"
        className="-ml-2 inline-flex items-center gap-1 text-sm text-neutral-500 transition hover:text-neutral-700"
      >
        <ChevronLeft size={16} />
        Productos
      </Link>

      <h1 className="mt-4 text-2xl font-bold tracking-tight">Nuevo producto</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Anota la info nutricional como aparece en el envase (por 100g).
      </p>

      <div className="mt-8">
        <ProductForm action={createProduct} submitLabel="Crear producto" />
      </div>
    </main>
  );
}
