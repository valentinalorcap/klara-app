import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Klara — your nutrition assistant',
  description:
    'Log meals in one tap, see your macros at a glance, get smart suggestions powered by Claude.',
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
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
