import { ImageResponse } from 'next/og';

export const size = { width: 192, height: 192 };
export const contentType = 'image/png';
export const dynamic = 'force-static';

export default function Icon192() {
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
        }}
      >
        <div
          style={{
            display: 'flex',
            backgroundImage: 'linear-gradient(135deg, #9963f6 0%, #fa5c63 100%)',
            backgroundClip: 'text',
            color: 'transparent',
            fontSize: 138,
            fontWeight: 900,
            fontFamily: 'system-ui, sans-serif',
            letterSpacing: -4,
          }}
        >
          K
        </div>
      </div>
    ),
    { ...size },
  );
}
