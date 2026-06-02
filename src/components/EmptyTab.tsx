import type { LucideIcon } from 'lucide-react';

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
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-200 text-neutral-500">
        <Icon size={26} />
      </div>
      <h1 className="mt-5 text-xl font-semibold text-neutral-900">{title}</h1>
      <p className="mt-2 max-w-xs text-sm text-neutral-500">{message}</p>
    </main>
  );
}
