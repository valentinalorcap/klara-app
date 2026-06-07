import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Klara — your nutrition assistant',
    short_name: 'Klara',
    description:
      'Log meals in one tap, see your macros at a glance, get smart suggestions powered by Claude.',
    start_url: '/today',
    display: 'standalone',
    background_color: '#0a0814',
    theme_color: '#9963f6',
    orientation: 'portrait',
    // Next.js auto-routes app/icon.tsx → /icon, app/icon1.tsx → /icon1, etc.
    // We point the manifest at the largest one and let the browser scale.
    icons: [
      { src: '/icon1', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon2', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
