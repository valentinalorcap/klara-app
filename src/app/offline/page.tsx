import type { Metadata } from 'next';
import { WifiOff } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Offline — Klara',
};

/**
 * Fallback shown by the service worker when a page is opened with no network
 * and nothing is cached yet. Kept outside the (app) group so it needs no auth
 * and can be precached. The gradient background comes from the root layout.
 */
export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-[var(--accent)]">
        <WifiOff size={24} />
      </div>
      <h1 className="text-xl font-bold text-white">You&apos;re offline</h1>
      <p className="max-w-xs text-sm text-neutral-400">
        Klara can&apos;t reach the network right now. Check your connection and try again — your
        data is safe.
      </p>
    </main>
  );
}
