import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { ScanFlow } from './ScanFlow';

export default function ScanProductPage() {
  return (
    <main className="px-6 py-10">
      <Link
        href="/products"
        className="-ml-2 inline-flex items-center gap-1 text-sm text-neutral-400 transition hover:text-neutral-200"
      >
        <ChevronLeft size={16} />
        Products
      </Link>

      <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">Scan label</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Take a photo of the nutrition label — Klara will read the macros for you.
      </p>

      <div className="mt-8">
        <ScanFlow />
      </div>
    </main>
  );
}
