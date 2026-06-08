'use client';

import { useEffect } from 'react';
import { TriangleAlert } from 'lucide-react';
import { GlassCard } from '@/components/GlassCard';

/**
 * Error boundary for the authenticated app routes. Catches render errors in any
 * `(app)/*` page and shows a recoverable fallback instead of a frozen screen.
 * (It does not catch event-handler or async errors — see global-error.tsx and,
 * later, Sentry for those.)
 */
export default function AppError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    // Surface in the console for now; remote capture (Sentry) lands in a later PR.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <GlassCard className="w-full max-w-sm p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-[var(--accent)]">
          <TriangleAlert size={26} />
        </div>
        <h1 className="mt-5 text-xl font-semibold text-white">Something went wrong</h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-400">
          This screen hit an unexpected error. You can try again, or reload the app.
        </p>
        <div className="mt-6 space-y-2">
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="w-full rounded-2xl bg-[var(--accent)] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_var(--accent-glow)] transition hover:bg-[var(--accent-hover)] active:scale-[0.98]"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="block w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-sm font-medium text-neutral-300 transition hover:bg-white/[0.08]"
          >
            Reload the app
          </button>
        </div>
        {error.digest ? <p className="mt-4 text-xs text-neutral-600">Ref: {error.digest}</p> : null}
      </GlassCard>
    </div>
  );
}
