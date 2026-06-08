'use client';

import { useEffect } from 'react';

/**
 * Last-resort boundary: catches errors in the root layout and in
 * `(app)/layout.tsx` (which `(app)/error.tsx` cannot). It replaces the root
 * layout, so it must render its own <html>/<body> and stay dependency-light
 * (no design tokens / framer-motion) in case the stylesheet failed to load.
 */
export default function GlobalError({
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

  const accentButton: React.CSSProperties = {
    appearance: 'none',
    border: 'none',
    borderRadius: '0.875rem',
    padding: '0.75rem 1.25rem',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#fff',
    background: '#9963f6',
    cursor: 'pointer',
  };
  const ghostButton: React.CSSProperties = {
    ...accentButton,
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.15)',
    color: '#d4d4d4',
    fontWeight: 500,
  };

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          padding: '1.5rem',
          background: '#0a0814',
          color: '#fff',
          textAlign: 'center',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <title>Something went wrong — Klara</title>
        <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>Something went wrong</h2>
        <p style={{ margin: 0, maxWidth: '20rem', fontSize: '0.875rem', color: '#a3a3a3' }}>
          The app hit an unexpected error. Try again, or reload.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" onClick={() => unstable_retry()} style={accentButton}>
            Try again
          </button>
          <button type="button" onClick={() => window.location.reload()} style={ghostButton}>
            Reload
          </button>
        </div>
        {error.digest ? (
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#6b6b6b' }}>Ref: {error.digest}</p>
        ) : null}
      </body>
    </html>
  );
}
