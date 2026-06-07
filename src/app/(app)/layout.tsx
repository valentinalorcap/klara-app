import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { BottomNav } from '@/components/BottomNav';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    // calc(env(safe-area-inset-top) + 0.75rem) pushes the page below
    // the iPhone notch / Dynamic Island when Klara is installed as a
    // PWA, and adds 12 px of breathing room so the top-of-page tap
    // targets sit clear of the status bar instead of grazing it. On
    // devices without a notch the inset resolves to 0, leaving just
    // the 12 px breathing room.
    <div className="min-h-screen pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-32">
      <div className="mx-auto max-w-md">{children}</div>
      <BottomNav />
    </div>
  );
}
