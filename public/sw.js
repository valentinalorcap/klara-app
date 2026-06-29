/**
 * Klara service worker — offline support + fast cold starts.
 *
 * No build plugin: Serwist/Workbox need a webpack config, but Klara builds with
 * Turbopack, so the caching is written by hand here. Strategy:
 *   - /_next/static/*  → cache-first  (content-hashed, immutable → instant load)
 *   - page navigations → network-first (fresh when online, cached when offline,
 *                        falling back to /offline)
 *   - other GETs       → stale-while-revalidate (fonts, icons, images)
 * POST requests (Server Actions), RSC payloads and /api are never cached, so
 * data is always fresh and we never serve another response's state.
 *
 * Bump VERSION to invalidate old caches on the next activate.
 */
const VERSION = 'v1';
const STATIC_CACHE = `klara-static-${VERSION}`;
const RUNTIME_CACHE = `klara-runtime-${VERSION}`;
const OFFLINE_URL = '/offline';

// Precache the offline fallback so it's available even on the very first
// offline open.
const PRECACHE_URLS = [OFFLINE_URL];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only GET is cacheable. POST = Server Actions → always hit the network.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Keep dynamic data fresh: RSC payloads, auth and API always go to network.
  if (
    request.headers.get('RSC') === '1' ||
    url.searchParams.has('_rsc') ||
    url.pathname.startsWith('/api/')
  ) {
    return;
  }

  // Immutable Next.js build assets.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Page loads.
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  // Everything else same-origin (fonts, icons, images).
  event.respondWith(staleWhileRevalidate(request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(STATIC_CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    return cached || (await caches.match(OFFLINE_URL)) || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || network;
}
