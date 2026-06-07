import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { BottomNav } from '@/components/BottomNav';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    // pt-[env(safe-area-inset-top)] pushes the page below the iPhone
    // notch / Dynamic Island when Klara is installed as a PWA. On
    // devices without a notch (and inside Safari with chrome) the inset
    // resolves to 0, so nothing changes.
    <div className="min-h-screen pt-[env(safe-area-inset-top)] pb-32">
      <div className="mx-auto max-w-md">{children}</div>
      <BottomNav />
    </div>
  );
}
