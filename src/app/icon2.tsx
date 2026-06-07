import { ImageResponse } from 'next/og';
import { loadInterBold } from '@/lib/icon-font';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';
export const dynamic = 'force-static';

export default function Icon512() {
  const interBold = loadInterBold();

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at top, #2c2756 0%, #0a0814 100%)',
      }}
    >
      <svg
        width={78}
        height={78}
        viewBox="-12 -12 24 24"
        style={{ position: 'absolute', top: 127, right: 68 }}
      >
        <path
          d="M0,-11 L2.5,-2.5 L11,0 L2.5,2.5 L0,11 L-2.5,2.5 L-11,0 L-2.5,-2.5 Z"
          fill="#4eddf1"
        />
      </svg>
      <div
        style={{
          display: 'flex',
          backgroundImage: 'linear-gradient(135deg, #9963f6 0%, #4eddf1 100%)',
          backgroundClip: 'text',
          color: 'transparent',
          fontSize: 370,
          fontWeight: 700,
          fontFamily: 'Inter',
          letterSpacing: -8,
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
