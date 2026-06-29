import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    // The label-scan Server Action receives a full photo as FormData. The
    // action itself caps each upload at 5 MB; this raises Next's transport
    // ceiling above that so the request reaches the action instead of
    // being rejected with a generic 500.
    serverActions: {
      bodySizeLimit: '6mb',
    },
  },
  async headers() {
    return [
      {
        // Never cache the service worker itself, so a new deploy's sw.js is
        // always fetched and can take over (the SW then caches everything else).
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        ],
      },
    ];
  },
};

export default nextConfig;
