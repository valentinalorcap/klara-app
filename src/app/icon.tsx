import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';
export const dynamic = 'force-static';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(ellipse at top, #2c2756 0%, #0a0814 100%)',
          borderRadius: 6,
        }}
      >
        <div
          style={{
            display: 'flex',
            backgroundImage: 'linear-gradient(135deg, #9963f6 0%, #fa5c63 100%)',
            backgroundClip: 'text',
            color: 'transparent',
            fontSize: 22,
            fontWeight: 900,
            fontFamily: 'system-ui, sans-serif',
            letterSpacing: -1,
          }}
        >
          K
        </div>
      </div>
    ),
    { ...size },
  );
}
