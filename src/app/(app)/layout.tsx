import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { BottomNav } from '@/components/BottomNav';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    // App-shell layout: pin the outer container to the viewport so the
    // document itself never scrolls, and put scroll on an inner element
    // instead. iOS rubber-band still happens inside that inner scroller
    // (so we keep the native bounce feel at the top and bottom of a
    // page), but the BottomNav — which lives as a sibling of the scroll
    // area — stays planted because the document body never moves.
    //
    // calc(env(safe-area-inset-top) + 0.75rem) on the scroll area
    // clears the iPhone notch / Dynamic Island and adds 12 px of
    // breathing room so top tap targets don't graze the status bar.
    <div className="fixed inset-0 flex flex-col">
      <main className="flex-1 overflow-y-auto pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-32">
        <div className="mx-auto max-w-md">{children}</div>
      </main>
      <BottomNav />
    </div>
  );
}
