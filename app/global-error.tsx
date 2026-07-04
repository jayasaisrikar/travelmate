'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#F9F9FC',
          color: '#3F3D56',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: '1rem',
        }}
      >
        <div
          style={{
            maxWidth: '28rem',
            width: '100%',
            background: '#fff',
            border: '1px solid #DDDCE8',
            borderRadius: '28px',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>
            Something went wrong
          </h1>
          <p style={{ color: '#6F6C82', fontSize: '0.875rem', lineHeight: 1.6 }}>
            A critical error interrupted wayflo. Reloading usually fixes this.
          </p>
          {error.digest && (
            <p style={{ color: '#8A869C', fontSize: '0.75rem' }}>Error reference: {error.digest}</p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: '1rem',
              borderRadius: '999px',
              border: 'none',
              background: '#6C63FF',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.875rem',
              padding: '0.65rem 1.5rem',
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
