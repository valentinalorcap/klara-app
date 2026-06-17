import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { BottomNav } from '@/components/BottomNav';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  // First-run gate: a user who hasn't been onboarded goes to /welcome (which
  // lives outside this layout, so there's no redirect loop).
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { onboardedAt: true },
  });
  if (me && !me.onboardedAt) redirect('/welcome');

  return (
    // App-shell layout: pin the outer container to the viewport so the
    // document itself never scrolls, and put scroll on an inner element
    // instead. iOS rubber-band still happens inside that inner scroller
    // (so we keep the native bounce feel at the top and bottom of a
    // page), but the BottomNav — which lives as a sibling of the scroll
    // area — stays planted because the document body never moves.
    //
    // env(safe-area-inset-top) on the scroll area clears the iPhone
    // notch / Dynamic Island; resolves to 0 on devices without one.
    <div className="fixed inset-0 flex flex-col">
      <main className="flex-1 overflow-y-auto pt-[env(safe-area-inset-top)] pb-32">
        <div className="mx-auto max-w-md">{children}</div>
      </main>
      <BottomNav />
    </div>
  );
}
