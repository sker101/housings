import { useEffect, useState } from 'react';
import { Download, RefreshCw, X } from 'lucide-react';
import { usePWAUpdate, isInstalledPWA } from '../hooks/usePWAUpdate';

/**
 * PWAUpdateBanner
 *
 * - Installed PWA (phone): shows a full bottom-sheet card with
 *   version info and an "Sasisha Sasa" button. User taps → app reloads
 *   with new version. No re-install needed.
 *
 * - Browser: invisible — updates are applied silently by usePWAUpdate.
 */
export function PWAUpdateBanner() {
  const { needRefresh, updateServiceWorker } = usePWAUpdate();
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setInstalled(isInstalledPWA());
  }, []);

  // Browser gets silent update — nothing to show
  if (!installed) return null;
  // Already dismissed or no update
  if (!needRefresh || dismissed) return null;

  return (
    <>
      <style>{`
        @keyframes pwa-update-in {
          from { opacity: 0; transform: translateY(100%); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Bottom-sheet overlay for installed PWA */}
      <div
        role="dialog"
        aria-label="Toleo jipya la iRent linapatikana"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 99999,
          padding: '0 0 env(safe-area-inset-bottom, 0)',
          animation: 'pwa-update-in 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <div style={{
          background: '#fff',
          borderRadius: '20px 20px 0 0',
          padding: '20px 20px calc(20px + env(safe-area-inset-bottom, 0))',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'var(--jade, #16a34a)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <RefreshCw size={22} color="#fff" />
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: '#111827' }}>
                  Toleo Jipya Lipo! 🎉
                </p>
                <p style={{ margin: 0, fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                  iRent imeboreshwa — bonyeza ili kupata maboresho mapya.
                </p>
              </div>
            </div>
            <button
              onClick={() => setDismissed(true)}
              aria-label="Funga"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#9ca3af', padding: 4, borderRadius: 6, flexShrink: 0,
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* What's new chips */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['🐛 Matatizo yaliotatuliwa', '⚡ Haraka zaidi', '✨ Vipengele vipya'].map(chip => (
              <span key={chip} style={{
                background: '#f0fdf4', border: '1px solid #bbf7d0',
                borderRadius: 999, padding: '3px 12px',
                fontSize: 12, color: '#15803d', fontWeight: 500,
              }}>{chip}</span>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={() => updateServiceWorker(true)}
            style={{
              width: '100%', padding: '14px',
              background: 'var(--jade, #16a34a)', color: '#fff',
              border: 'none', borderRadius: 14, fontWeight: 700,
              fontSize: 15, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 4px 20px rgba(22,163,74,0.35)',
            }}
          >
            <Download size={18} />
            Sasisha Sasa — Bure
          </button>

          <p style={{ margin: 0, fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>
            Huhitaji kusakinisha upya. Programu itaendelea moja kwa moja.
          </p>
        </div>
      </div>
    </>
  );
}
