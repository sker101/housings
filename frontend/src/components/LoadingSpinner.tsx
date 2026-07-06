import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  text?: string;
  fullPage?: boolean;
}

export function LoadingSpinner({ 
  size = 'medium', 
  color = '#1D9E75',
  text,
  fullPage = false 
}: LoadingSpinnerProps) {
  const sizeMap = {
    small: { spinner: 24, border: 3 },
    medium: { spinner: 40, border: 4 },
    large: { spinner: 64, border: 5 }
  };

  const { spinner, border } = sizeMap[size];

  const containerStyle: React.CSSProperties = fullPage ? {
    minHeight: '100dvh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1rem',
    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
  } : {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1rem',
    padding: '3rem'
  };

  return (
    <div style={containerStyle}>
      <div
        style={{
          width: spinner,
          height: spinner,
          border: `${border}px solid rgba(29, 158, 117, 0.15)`,
          borderTop: `${border}px solid ${color}`,
          borderRadius: '50%',
          animation: 'spinner-rotate 0.8s linear infinite',
          boxShadow: '0 0 20px rgba(29, 158, 117, 0.2)'
        }}
      />
      {text && (
        <p style={{
          margin: 0,
          color: '#64748b',
          fontSize: '0.95rem',
          fontWeight: 500,
          letterSpacing: '0.5px'
        }}>
          {text}
        </p>
      )}
      <style>{`
        @keyframes spinner-rotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div style={{
      minHeight: '100dvh',
      background: '#f8fafc',
      padding: '2rem'
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* Welcome section skeleton */}
        <div style={{
          height: '180px',
          background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
          borderRadius: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem'
        }}>
          <div
            style={{
              width: 48,
              height: 48,
              border: '4px solid rgba(255, 255, 255, 0.3)',
              borderTop: '4px solid #1D9E75',
              borderRadius: '50%',
              animation: 'spinner-rotate 0.8s linear infinite'
            }}
          />
          <span style={{
            color: '#1D9E75',
            fontSize: '1.1rem',
            fontWeight: 600
          }}>
            Loading dashboard...
          </span>
        </div>

        {/* KPI Cards skeleton */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem'
        }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{
              height: '120px',
              background: 'white',
              borderRadius: '16px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <div style={{
                width: '40%',
                height: '16px',
                background: '#e2e8f0',
                borderRadius: '8px'
              }} />
              <div style={{
                width: '60%',
                height: '32px',
                background: '#e2e8f0',
                borderRadius: '8px'
              }} />
              <div style={{
                width: '80%',
                height: '14px',
                background: '#e2e8f0',
                borderRadius: '6px'
              }} />
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes spinner-rotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
