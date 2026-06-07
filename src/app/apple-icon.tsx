import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';
export const dynamic = 'force-static';

export default function AppleIcon() {
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
        width={26}
        height={26}
        viewBox="-12 -12 24 24"
        style={{ position: 'absolute', top: 32, right: 36 }}
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
          fontSize: 130,
          fontWeight: 700,
          fontFamily: 'system-ui, sans-serif',
          letterSpacing: -3,
        }}
      >
        K
      </div>
    </div>,
    { ...size },
  );
}
