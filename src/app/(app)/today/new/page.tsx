import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { auth } from '@/auth';
import { NewMealClient } from '@/components/NewMealClient';
import { loadMealFormData } from '@/app/(app)/today/_data';
import { isoDate, isDateKey } from '@/lib/meals';

export default async function NewMealPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await auth();
  const userId = session!.user.id;
  const { items, favoriteMeals } = await loadMealFormData(userId);

  const { date } = await searchParams;
  // Only a valid, non-today date means "add to a navigated past/future day".
  const targetDate = isDateKey(date) && date !== isoDate(new Date()) ? date : undefined;
  const backTo = targetDate ? `/today?date=${targetDate}` : '/today';

  return (
    <main className="px-4 py-10">
      <Link
        href={backTo}
        className="-ml-2 inline-flex items-center gap-1 text-sm text-neutral-400 transition hover:text-neutral-200"
      >
        <ChevronLeft size={16} />
        Back
      </Link>

      <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">Add meals</h1>

      <NewMealClient items={items} favorites={favoriteMeals} targetDate={targetDate} />
    </main>
  );
}
