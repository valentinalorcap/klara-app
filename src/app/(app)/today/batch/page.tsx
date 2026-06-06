import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { auth } from '@/auth';
import { MealBatchBuilder } from '@/components/MealBatchBuilder';
import { loadMealFormData } from '@/app/(app)/today/_data';

export default async function BatchMealPage() {
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

      <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">Batch meals</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Add several meals from one session — pre-workout, breakfast, lunch — and Klara evaluates the
        combination instead of each one alone.
      </p>

      <div className="mt-8">
        <MealBatchBuilder items={items} favorites={favoriteMeals} />
      </div>
    </main>
  );
}
