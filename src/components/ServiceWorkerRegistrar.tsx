'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker (public/sw.js) once on mount. Production only —
 * in dev a caching SW would fight Turbopack's HMR. Renders nothing.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker
      .register('/sw.js')
      .catch((err) => console.error('Service worker registration failed', err));
  }, []);

  return null;
}
