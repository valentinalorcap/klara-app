'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BarChart3, MessageCircle, Package, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

const sideTabs = [
  { href: '/today', label: 'Today', icon: Home },
  { href: '/history', label: 'History', icon: BarChart3 },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/library', label: 'Library', icon: Star },
] as const;

const chatTab = { href: '/chat', label: 'Chat', icon: MessageCircle } as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 flex justify-center pb-[max(calc(env(safe-area-inset-bottom)-0.5rem),0.5rem)]"
      aria-label="Primary navigation"
    >
      <div className="relative mx-auto flex w-full max-w-md items-end justify-center px-4">
        <div className="relative flex w-full items-center justify-around rounded-full border border-white/10 bg-black/40 px-4 py-3 backdrop-blur-2xl">
          <NavLink tab={sideTabs[0]} active={isActive(pathname, sideTabs[0].href)} />
          <NavLink tab={sideTabs[1]} active={isActive(pathname, sideTabs[1].href)} />
          {/* spacer for the elevated FAB */}
          <div className="w-16 shrink-0" aria-hidden />
          <NavLink tab={sideTabs[2]} active={isActive(pathname, sideTabs[2].href)} />
          <NavLink tab={sideTabs[3]} active={isActive(pathname, sideTabs[3].href)} />
        </div>

        <ChatFab active={isActive(pathname, chatTab.href)} />
      </div>
    </nav>
  );
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  tab,
  active,
}: {
  tab: { href: string; label: string; icon: typeof Home };
  active: boolean;
}) {
  const Icon = tab.icon;
  return (
    <Link
      href={tab.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex flex-col items-center gap-0.5 px-2 transition-colors',
        active ? 'text-white' : 'text-neutral-400 hover:text-neutral-200',
      )}
    >
      <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
      <span className={cn('text-[10px]', active && 'font-medium')}>{tab.label}</span>
    </Link>
  );
}

function ChatFab({ active }: { active: boolean }) {
  const Icon = chatTab.icon;
  return (
    <Link
      href={chatTab.href}
      aria-current={active ? 'page' : undefined}
      aria-label={chatTab.label}
      className={cn(
        'absolute -top-4 left-1/2 -translate-x-1/2',
        'flex h-16 w-16 items-center justify-center rounded-full',
        'bg-[var(--accent)] text-white shadow-[0_8px_24px_-4px_var(--accent-glow)]',
        'ring-4 ring-[#0a0814] transition-transform active:scale-95',
        'hover:bg-[var(--accent-hover)]',
      )}
    >
      <Icon size={26} strokeWidth={2.2} />
    </Link>
  );
}
