import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { BottomNav } from '@/components/BottomNav';
import { ToastProvider } from '@/components/Toast';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    // App-shell: fixed outer container so the document never scrolls; an inner
    // element handles scroll. The BottomNav stays planted as a sibling.
    // pt safe-area clears the iPhone notch / Dynamic Island.
    <ToastProvider>
      <div className="fixed inset-0 flex flex-col">
        <main className="flex-1 overflow-y-auto pt-[env(safe-area-inset-top)] pb-32">
          <div className="mx-auto max-w-md">{children}</div>
        </main>
        <BottomNav />
      </div>
    </ToastProvider>
  );
}
