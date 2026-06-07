import { ImageResponse } from 'next/og';

export const size = { width: 192, height: 192 };
export const contentType = 'image/png';
export const dynamic = 'force-static';

export default function Icon192() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse 80% 60% at 50% 0%, #1e1b4b 0%, #0a0814 100%)',
        color: '#fa5c63',
        fontSize: 132,
        fontWeight: 800,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      K
    </div>,
    { ...size },
  );
}
