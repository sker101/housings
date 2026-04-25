import React from 'react';

export default function AuthLoader({
  title = 'Loading',
  subtitle = 'Please wait…',
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <div style={overlay} role="status" aria-live="polite">
      <style>{keyframes}</style>
      <div style={card}>
        {/* Animated Logo Spinner */}
        <div style={logoContainer}>
          <div style={pulseRing} />
          <div style={spinRing}>
            <svg viewBox="0 0 40 40" style={spinSvg}>
              <defs>
                <linearGradient id="greenGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#22c55e" />
                  <stop offset="100%" stopColor="#16a34a" />
                </linearGradient>
              </defs>
              <circle cx="20" cy="20" r="16" stroke="#e6f6ee" strokeWidth="3" fill="none" />
              <circle cx="20" cy="20" r="16" stroke="url(#greenGradient)" strokeWidth="3" strokeLinecap="round" strokeDasharray="40 60" fill="none" />
            </svg>
          </div>
          <div style={logoInner}>🏠</div>
        </div>

        <h1 style={titleStyle}>{title}</h1>
        <p style={subtitleStyle}>{subtitle}</p>
        
        {/* Animated dots */}
        <div style={dotsContainer}>
          <span style={{...dot, animationDelay: '0ms'}} />
          <span style={{...dot, animationDelay: '150ms'}} />
          <span style={{...dot, animationDelay: '300ms'}} />
        </div>
      </div>
    </div>
  );
}

const keyframes = `
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes pulse { 0%, 100% { transform: scale(1); opacity: 0.6 } 50% { transform: scale(1.15); opacity: 0 } }
@keyframes popIn { 0% { transform: translateY(20px) scale(0.9); opacity: 0 } 100% { transform: translateY(0) scale(1); opacity: 1 } }
@keyframes bounce { 0%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-8px); } }
@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
`;

const overlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(255,255,255,0.95)',
  backdropFilter: 'blur(8px)',
  zIndex: 9999,
  padding: '1rem',
};

const card: React.CSSProperties = {
  background: 'linear-gradient(145deg, #ffffff 0%, #f8faf8 50%, #f0fdf4 100%)',
  borderRadius: 24,
  padding: '2.5rem 2rem',
  textAlign: 'center',
  maxWidth: 320,
  width: '100%',
  boxShadow: '0 20px 60px rgba(22,163,74,0.15), 0 8px 24px rgba(0,0,0,0.05)',
  animation: 'popIn 500ms cubic-bezier(0.34, 1.56, 0.64, 1)',
  border: '1px solid rgba(22,163,74,0.12)',
};

const logoContainer: React.CSSProperties = {
  position: 'relative',
  width: 80,
  height: 80,
  margin: '0 auto 1.5rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const pulseRing: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  borderRadius: '50%',
  background: 'radial-gradient(circle, rgba(34,197,94,0.2) 0%, transparent 70%)',
  animation: 'pulse 2s ease-in-out infinite',
};

const spinRing: React.CSSProperties = {
  position: 'absolute',
  inset: 4,
  animation: 'spin 1.2s linear infinite',
};

const spinSvg: React.CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'block',
};

const logoInner: React.CSSProperties = {
  position: 'absolute',
  fontSize: '1.8rem',
  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
  animation: 'pulse 2s ease-in-out infinite reverse',
};

const titleStyle: React.CSSProperties = {
  fontSize: '1.25rem',
  fontWeight: 700,
  color: '#166534',
  margin: '0 0 0.5rem',
  letterSpacing: '-0.01em',
};

const subtitleStyle: React.CSSProperties = {
  fontSize: '0.95rem',
  color: '#65a30d',
  margin: '0 0 1rem',
  fontWeight: 500,
};

const dotsContainer: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  justifyContent: 'center',
  alignItems: 'center',
};

const dot: React.CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
  animation: 'bounce 1.4s ease-in-out infinite',
};
