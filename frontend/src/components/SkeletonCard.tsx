import React from 'react';

interface SkeletonCardProps {
  variant?: 'card' | 'row' | 'kpi' | 'activity';
  count?: number;
}

function pulse(style: React.CSSProperties = {}): React.CSSProperties {
  return {
    background: 'linear-gradient(90deg, var(--cream) 25%, var(--border) 50%, var(--cream) 75%)',
    backgroundSize: '200% 100%',
    animation: 'skeleton-pulse 1.4s ease infinite',
    borderRadius: 8,
    ...style,
  };
}

function CardSkeleton() {
  return (
    <div
      className="skeleton-card"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 18,
        overflow: 'hidden',
      }}
    >
      <div style={pulse({ height: 160, borderRadius: 0 })} />
      <div style={{ padding: '0.84rem', display: 'grid', gap: '0.6rem' }}>
        <div style={pulse({ height: 16, width: '70%' })} />
        <div style={pulse({ height: 13, width: '45%' })} />
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <div style={pulse({ height: 22, width: 60 })} />
          <div style={pulse({ height: 22, width: 70 })} />
        </div>
      </div>
    </div>
  );
}

function RowSkeleton() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr auto',
        gap: '1rem',
        alignItems: 'center',
        padding: '0.75rem 1rem',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 10,
      }}
    >
      <div style={pulse({ height: 14, width: '80%' })} />
      <div style={pulse({ height: 14, width: '60%' })} />
      <div style={pulse({ height: 22, width: 70 })} />
      <div style={pulse({ height: 30, width: 80 })} />
    </div>
  );
}

function KpiSkeleton() {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: '1rem',
        display: 'grid',
        gap: '0.5rem',
      }}
    >
      <div style={pulse({ height: 12, width: 80 })} />
      <div style={pulse({ height: 28, width: 120 })} />
      <div style={pulse({ height: 11, width: 60 })} />
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
      <div style={pulse({ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 })} />
      <div style={{ flex: 1, display: 'grid', gap: '0.3rem' }}>
        <div style={pulse({ height: 13, width: '75%' })} />
        <div style={pulse({ height: 11, width: '40%' })} />
      </div>
    </div>
  );
}

export function SkeletonCard({ variant = 'card', count = 1 }: SkeletonCardProps) {
  const items = Array.from({ length: count }, (_, i) => i);

  return (
    <>
      <style>{`
        @keyframes skeleton-pulse {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      {items.map((i) => (
        <React.Fragment key={i}>
          {variant === 'card'     && <CardSkeleton />}
          {variant === 'row'      && <RowSkeleton />}
          {variant === 'kpi'      && <KpiSkeleton />}
          {variant === 'activity' && <ActivitySkeleton />}
        </React.Fragment>
      ))}
    </>
  );
}
