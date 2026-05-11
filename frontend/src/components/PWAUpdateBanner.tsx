import { RefreshCw } from 'lucide-react';
import { usePWAUpdate } from '../hooks/usePWAUpdate';

export function PWAUpdateBanner() {
  const { needRefresh, updateServiceWorker } = usePWAUpdate();

  if (!needRefresh) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: '80px', // above mobile bottom nav
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        background: 'var(--jade)',
        color: '#fff',
        borderRadius: '999px',
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
        fontSize: '14px',
        fontWeight: 500,
        whiteSpace: 'nowrap',
        animation: 'pwa-slide-up 0.3s ease',
      }}
    >
      <RefreshCw size={16} />
      <span>Toleo jipya la iRent lipo!</span>
      <button
        onClick={() => updateServiceWorker(true)}
        style={{
          background: '#fff',
          color: 'var(--jade)',
          border: 'none',
          borderRadius: '999px',
          padding: '4px 14px',
          fontWeight: 700,
          cursor: 'pointer',
          fontSize: '13px',
        }}
      >
        Sasisha
      </button>
      <style>{`
        @keyframes pwa-slide-up {
          from { opacity: 0; transform: translateX(-50%) translateY(16px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
