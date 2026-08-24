import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ServiceWorkerRegistrar } from '@/components/ServiceWorkerRegistrar';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Klara — nutrition assistant',
  description: 'Log meals, see the macros, get smart suggestions.',
  // PWA / iOS home-screen behaviour. With these set, "Add to Home Screen"
  // installs Klara as a standalone app — no Safari chrome around it.
  applicationName: 'Klara',
  appleWebApp: {
    capable: true,
    title: 'Klara',
    statusBarStyle: 'black-translucent',
  },
  manifest: '/manifest.webmanifest',
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Match the gradient bottom so iOS doesn't flash white around notches.
  themeColor: '#0a0814',
  // Locking maximumScale keeps Safari from doing the disruptive zoom-in
  // when the user taps an input that's smaller than 16px.
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  // With overlays-content the on-screen keyboard sits on top of the page
  // without shrinking the viewport, so the BottomNav stays at the
  // bottom of the layout (hidden behind the keyboard) instead of being
  // shoved upward to sit above it.
  interactiveWidget: 'overlays-content',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
