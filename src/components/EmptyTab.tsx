import type { LucideIcon } from 'lucide-react';
import { GlassCard } from './GlassCard';

export function EmptyTab({
  icon: Icon,
  title,
  message,
}: {
  icon: LucideIcon;
  title: string;
  message: string;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <GlassCard className="w-full max-w-sm p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-[var(--accent)]">
          <Icon size={26} />
        </div>
        <h1 className="mt-5 text-xl font-semibold text-white">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-400">{message}</p>
      </GlassCard>
    </main>
  );
}
