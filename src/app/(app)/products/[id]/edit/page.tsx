import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { ProductForm } from '@/components/ProductForm';
import { DeleteProductButton } from '@/components/DeleteProductButton';
import { deleteProduct, updateProduct } from '../../actions';

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const product = await prisma.product.findUnique({ where: { id } });

  if (!product || product.userId !== session!.user.id) {
    notFound();
  }

  const updateAction = updateProduct.bind(null, id);
  const deleteAction = deleteProduct.bind(null, id);

  return (
    <main className="px-6 py-10">
      <Link
        href="/products"
        className="-ml-2 inline-flex items-center gap-1 text-sm text-neutral-400 transition hover:text-neutral-200"
      >
        <ChevronLeft size={16} />
        Products
      </Link>

      <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">Edit product</h1>

      <div className="mt-8">
        <ProductForm action={updateAction} initialValues={product} submitLabel="Save changes" />
        <DeleteProductButton action={deleteAction} />
      </div>
    </main>
  );
}
