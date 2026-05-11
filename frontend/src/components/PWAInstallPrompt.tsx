import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { isMobileDevice } from '../hooks/usePWAUpdate';

const DISMISS_KEY = 'irent_install_dismissed';

/**
 * PWAInstallPrompt
 *
 * Only shown on MOBILE devices that haven't installed the PWA yet.
 * Desktop browsers are excluded — they can use the app in the browser fine.
 * Appears 30 seconds after first visit, once per device.
 */
export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [visible, setVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(isMobileDevice());
  }, []);

  useEffect(() => {
    // Only relevant on mobile
    if (!isMobile) return;
    // Already dismissed by user
    if (localStorage.getItem(DISMISS_KEY)) return;
    // Already running as installed PWA
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    ) return;

    let showTimer: ReturnType<typeof setTimeout>;

    const handler = (e: Event) => {
      e.preventDefault(); // prevent browser default mini-infobar
      setDeferredPrompt(e);
      // Show our custom card after 30 seconds
      showTimer = setTimeout(() => setVisible(true), 30_000);
    };

    window.addEventListener('beforeinstallprompt', handler as EventListener);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler as EventListener);
      clearTimeout(showTimer);
    };
  }, [isMobile]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
  };

  if (!visible || !isMobile) return null;

  return (
    <>
      <style>{`
        @keyframes pwa-install-in {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      <div
        role="dialog"
        aria-label="Sakinisha iRent kwenye simu yako"
        style={{
          position: 'fixed',
          bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
          left: 16,
          right: 16,
          zIndex: 9998,
          background: '#fff',
          border: '1px solid var(--border, #e5e7eb)',
          borderRadius: 18,
          padding: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          animation: 'pwa-install-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
          maxWidth: 420,
          margin: '0 auto',
        }}
      >
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img
              src="/icon-192.png"
              width={48}
              height={48}
              style={{ borderRadius: 12, flexShrink: 0 }}
              alt="iRent icon"
            />
            <div>
              <div style={{ fontWeight: 700, color: 'var(--ink, #111827)', fontSize: 15, lineHeight: 1.3 }}>
                Sakinisha iRent
              </div>
              <div style={{ color: 'var(--mid, #6b7280)', fontSize: 13, marginTop: 2 }}>
                Ongeza kwenye skrini yako ya nyumbani
              </div>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            aria-label="Funga"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--mid, #6b7280)', padding: 4, borderRadius: 6, flexShrink: 0,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Feature chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['⚡ Haraka zaidi', '📡 Inafanya kazi nje ya mtandao', '🔔 Arifa moja kwa moja'].map(chip => (
            <span
              key={chip}
              style={{
                background: 'var(--cream, #f8fafc)',
                border: '1px solid var(--border, #e5e7eb)',
                borderRadius: 999, padding: '3px 10px',
                fontSize: 12, color: 'var(--ink, #111827)', fontWeight: 500,
              }}
            >
              {chip}
            </span>
          ))}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleDismiss}
            style={{
              flex: 1, padding: 10, borderRadius: 10,
              border: '1px solid var(--border, #e5e7eb)', background: '#fff',
              color: 'var(--mid, #6b7280)', cursor: 'pointer',
              fontWeight: 500, fontSize: 14,
            }}
          >
            Sasa hivi siitaji
          </button>
          <button
            onClick={handleInstall}
            style={{
              flex: 2, padding: 10, borderRadius: 10,
              border: 'none', background: 'var(--jade, #16a34a)',
              color: '#fff', cursor: 'pointer', fontWeight: 600,
              fontSize: 14, display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 8,
            }}
          >
            <Download size={16} />
            Sakinisha Bure
          </button>
        </div>
      </div>
    </>
  );
}
