import { ImageResponse } from 'next/og';
import { loadInterBold } from '@/lib/icon-font';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';
export const dynamic = 'force-static';

export default function Icon() {
  const interBold = loadInterBold();

  // 32px favicon: skip the sparkle (too small to read) and just show the
  // gradient K on the navy bg.
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at top, #1a1338 0%, #050308 100%)',
        borderRadius: 6,
      }}
    >
      <div
        style={{
          display: 'flex',
          backgroundImage: 'linear-gradient(135deg, #9963f6 0%, #4eddf1 100%)',
          backgroundClip: 'text',
          color: 'transparent',
          fontSize: 22,
          fontWeight: 700,
          fontFamily: 'Inter',
          letterSpacing: -1,
        }}
      >
        K
      </div>
    </div>,
    {
      ...size,
      fonts: [{ name: 'Inter', data: interBold, weight: 700, style: 'normal' }],
    },
  );
}
