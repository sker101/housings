import { useState } from 'react';
import { Download, RefreshCw, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePWAUpdate } from '../hooks/usePWAUpdate';

/**
 * PWAUpdateBanner
 *
 * - Option 1: Glassmorphic bottom prompt.
 * - Auto-adapts to user's language via i18next (Swahili/English).
 * - Shows on both mobile (full bottom-sheet) and desktop (floating corner card).
 * - Clicking "Update Now" triggers skipWaiting() and reloads the app cleanly.
 */
export function PWAUpdateBanner() {
  const { needRefresh, updateServiceWorker } = usePWAUpdate();
  const [dismissed, setDismissed] = useState(false);
  const { t } = useTranslation();

  // Already dismissed or no update ready
  if (!needRefresh || dismissed) return null;

  return (
    <>
      <style>{`
        .pwa-banner-card {
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: 420px;
          max-width: calc(100vw - 48px);
          border-radius: 20px;
          border: 1px solid rgba(22, 163, 74, 0.25);
          background: rgba(255, 255, 255, 0.82);
          backdrop-filter: blur(20px) saturate(190%);
          -webkit-backdrop-filter: blur(20px) saturate(190%);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.16);
          padding: 20px;
          z-index: 99999;
          animation: pwa-update-desktop-in 0.4s cubic-bezier(0.22, 1, 0.36, 1);
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        @media (max-width: 768px) {
          .pwa-banner-card {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            width: 100%;
            max-width: 100%;
            border-radius: 24px 24px 0 0;
            border: none;
            border-top: 1px solid rgba(22, 163, 74, 0.2);
            background: rgba(255, 255, 255, 0.86);
            padding: 20px 20px calc(20px + env(safe-area-inset-bottom, 12px));
            box-shadow: 0 -8px 45px rgba(0, 0, 0, 0.18);
            animation: pwa-update-mobile-in 0.4s cubic-bezier(0.22, 1, 0.36, 1);
          }
        }
        
        @keyframes pwa-update-desktop-in {
          from { opacity: 0; transform: translateY(24px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        
        @keyframes pwa-update-mobile-in {
          from { opacity: 0; transform: translateY(100%); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .pwa-chip {
          background: rgba(22, 163, 74, 0.08);
          border: 1px solid rgba(22, 163, 74, 0.2);
          border-radius: 999px;
          padding: 4px 12px;
          font-size: 12px;
          color: #15803d;
          font-weight: 600;
          transition: all 0.2s;
        }

        .pwa-chip:hover {
          background: rgba(22, 163, 74, 0.12);
        }

        .pwa-update-btn {
          width: 100%;
          padding: 14px;
          background: var(--jade, #16a34a);
          color: #fff;
          border: none;
          border-radius: 14px;
          fontWeight: 700;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 20px rgba(22, 163, 74, 0.3);
          transition: all 0.2s ease;
        }

        .pwa-update-btn:hover {
          background: #15803d;
          transform: translateY(-1px);
          box-shadow: 0 6px 24px rgba(22, 163, 74, 0.4);
        }

        .pwa-update-btn:active {
          transform: translateY(0);
        }

        .pwa-close-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: #9ca3af;
          padding: 6px;
          border-radius: 50%;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s, color 0.2s;
        }

        .pwa-close-btn:hover {
          background-color: rgba(0, 0, 0, 0.05);
          color: #4b5563;
        }
      `}</style>

      <div className="pwa-banner-card" role="dialog" aria-label={t('pwa.updateTitle', 'New Version Available! 🎉')}>
        {/* Header Section */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'var(--jade, #16a34a)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
              flexShrink: 0,
            }}>
              <RefreshCw size={22} color="#fff" style={{ animation: 'spin 8s linear infinite' }} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontWeight: 750, fontSize: '15.5px', color: '#111827', lineHeight: 1.25 }}>
                {t('pwa.updateTitle', 'New Version Available! 🎉')}
              </h4>
              <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#4b5563', lineHeight: 1.4 }}>
                {t('pwa.updateSubtitle', 'iRent has been updated — click below to get the latest improvements.')}
              </p>
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="pwa-close-btn"
            aria-label={t('common.close', 'Funga')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Dynamic Changelog Highlights */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
          <span className="pwa-chip">{t('pwa.chipBugFixes', '🐛 Matatizo yaliyotatuliwa')}</span>
          <span className="pwa-chip">{t('pwa.chipPerformance', '⚡ Haraka zaidi')}</span>
          <span className="pwa-chip">{t('pwa.chipNewFeatures', '✨ Vipengele vipya')}</span>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 2 }}>
          <button
            onClick={() => updateServiceWorker(true)}
            className="pwa-update-btn"
          >
            <Download size={18} />
            {t('pwa.updateButton', 'Sasisha Sasa')}
          </button>
          
          <p style={{ margin: 0, fontSize: '11.5px', color: '#6b7280', textAlign: 'center', lineHeight: 1.3 }}>
            {t('pwa.updateNote', 'Huhitaji kusakinisha upya. Programu itaendelea moja kwa moja.')}
          </p>
        </div>
      </div>
    </>
  );
}
