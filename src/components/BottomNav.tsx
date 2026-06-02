'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Package, ChefHat, MessageCircle, BarChart3 } from 'lucide-react';

const tabs = [
  { href: '/today', label: 'Hoy', icon: Home },
  { href: '/products', label: 'Productos', icon: Package },
  { href: '/recipes', label: 'Recetas', icon: ChefHat },
  { href: '/chat', label: 'Chat', icon: MessageCircle },
  { href: '/history', label: 'Historial', icon: BarChart3 },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)]"
      aria-label="Navegación principal"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-2">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`flex flex-col items-center gap-1 px-2 py-2 text-xs transition-colors ${
                  active ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-600'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
                <span className={active ? 'font-medium' : ''}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
