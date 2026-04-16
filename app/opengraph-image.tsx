import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'wayflo';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '56px',
          background:
            'radial-gradient(circle at top left, rgba(108,99,255,0.18), transparent 34%), radial-gradient(circle at top right, rgba(255,101,132,0.16), transparent 26%), linear-gradient(135deg, #F2F2F2 0%, #FBFAFF 52%, #FFEAF0 100%)',
          color: '#3F3D56',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div
            style={{
              width: '88px',
              height: '88px',
              borderRadius: '24px',
              background: '#6C63FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 20px 50px rgba(108,99,255,0.22)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: '18px 20px auto 20px',
                height: '3px',
                borderRadius: '999px',
                background: '#FF6584',
                transform: 'rotate(-12deg)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: '34px 20px auto 20px',
                height: '3px',
                borderRadius: '999px',
                background: 'rgba(255,255,255,0.92)',
                transform: 'rotate(-12deg)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: '50px 20px auto 20px',
                height: '3px',
                borderRadius: '999px',
                background: 'rgba(255,255,255,0.55)',
                transform: 'rotate(-12deg)',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 84, fontWeight: 700, letterSpacing: '-0.06em', lineHeight: 1 }}>
              <span style={{ color: '#6C63FF' }}>way</span>
              <span style={{ color: '#FF6584' }}>flo</span>
            </div>
            <div
              style={{
                marginTop: '10px',
                fontSize: '28px',
                letterSpacing: '0.24em',
                textTransform: 'uppercase',
                color: '#7E7A92',
              }}
            >
              travel. flow. freedom.
            </div>
          </div>
        </div>

        <div style={{ maxWidth: '780px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignSelf: 'flex-start',
              padding: '12px 18px',
              borderRadius: '999px',
              background: 'rgba(255,255,255,0.72)',
              color: '#6C63FF',
              fontSize: '22px',
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}
          >
            Explore freely
          </div>
          <div style={{ fontSize: 58, lineHeight: 1.02, fontWeight: 700, letterSpacing: '-0.05em' }}>
            Plan trips that stay in sync with your timing.
          </div>
          <div style={{ fontSize: 28, lineHeight: 1.35, color: '#6F6C82' }}>
            Wayflo turns real destinations, trip windows, budgets, and preferences into saved itineraries that feel
            calm and ready to use.
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
