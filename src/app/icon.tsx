import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';
export const dynamic = 'force-static';

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1e1b4b 0%, #0a0814 100%)',
        color: '#fa5c63',
        fontSize: 22,
        fontWeight: 800,
        fontFamily: 'system-ui, sans-serif',
        borderRadius: 6,
      }}
    >
      K
    </div>,
    { ...size },
  );
}
