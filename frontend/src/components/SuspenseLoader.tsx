import React from 'react';

export default function SuspenseLoader() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      width: '100vw',
      background: '#fafbfc',
      color: '#166534'
    }}>
      <style>{`
        @keyframes suspense-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div style={{
        width: '40px',
        height: '40px',
        border: '3px solid #e2e8f0',
        borderTopColor: '#166534',
        borderRadius: '50%',
        animation: 'suspense-spin 0.8s linear infinite'
      }} />
    </div>
  );
}
