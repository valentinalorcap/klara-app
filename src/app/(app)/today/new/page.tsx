import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { auth } from '@/auth';
import { NewMealClient } from '@/components/NewMealClient';
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

      <NewMealClient items={items} favorites={favoriteMeals} />
    </main>
  );
}
