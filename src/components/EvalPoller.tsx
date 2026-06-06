'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * While any meal on the page has a PENDING evaluation, refresh the route
 * every 3 seconds so Today picks up the result as soon as Anthropic
 * responds. Stops after `maxAttempts` to avoid hammering the server if
 * something is stuck.
 */
export function EvalPoller({
  hasPending,
  intervalMs = 3000,
  maxAttempts = 12,
}: {
  hasPending: boolean;
  intervalMs?: number;
  maxAttempts?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!hasPending) return;
    let attempts = 0;
    const id = setInterval(() => {
      attempts += 1;
      router.refresh();
      if (attempts >= maxAttempts) clearInterval(id);
    }, intervalMs);
    return () => clearInterval(id);
  }, [hasPending, intervalMs, maxAttempts, router]);

  return null;
}
