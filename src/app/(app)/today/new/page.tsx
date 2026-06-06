import Link from 'next/link';
import { ChevronLeft, Layers } from 'lucide-react';
import { auth } from '@/auth';
import { MealForm } from '@/components/MealForm';
import { loadMealFormData } from '@/app/(app)/today/_data';

export default async function NewMealPage() {
  const session = await auth();
  const userId = session!.user.id;
  const { items, favoriteMeals } = await loadMealFormData(userId);

  return (
    <main className="px-6 py-10">
      <Link
        href="/today"
        className="-ml-2 inline-flex items-center gap-1 text-sm text-neutral-400 transition hover:text-neutral-200"
      >
        <ChevronLeft size={16} />
        Today
      </Link>

      <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">New meal</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Pick the type, give it a name if you want, and add what you ate.
      </p>

      <Link
        href="/today/batch"
        className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-[var(--accent)] transition hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/5"
      >
        <Layers size={12} />
        Batch multiple meals →
      </Link>

      <div className="mt-8">
        <MealForm items={items} favorites={favoriteMeals} />
      </div>
    </main>
  );
}
