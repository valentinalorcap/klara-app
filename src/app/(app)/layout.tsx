import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { BottomNav } from '@/components/BottomNav';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <div className="min-h-screen pb-32">
      <div className="mx-auto max-w-md">{children}</div>
      <BottomNav />
    </div>
  );
}
