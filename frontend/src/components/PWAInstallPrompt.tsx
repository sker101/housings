import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

const DISMISS_KEY = 'irent_install_dismissed';

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // If already dismissed, never show again
    if (localStorage.getItem(DISMISS_KEY)) return;

    // If already installed (standalone mode), don't show
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    let showTimer: ReturnType<typeof setTimeout>;

    const handler = (e: Event) => {
      e.preventDefault(); // block browser default mini-infobar
      setDeferredPrompt(e);
      // Show our custom prompt after 30 seconds
      showTimer = setTimeout(() => setVisible(true), 30_000);
    };

    window.addEventListener('beforeinstallprompt', handler as EventListener);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler as EventListener);
      clearTimeout(showTimer);
    };
  }, []);

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

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Sakinisha iRent kwenye simu yako"
      style={{
        position: 'fixed',
        bottom: '80px',
        left: '16px',
        right: '16px',
        zIndex: 9998,
        background: '#fff',
        border: '1px solid var(--border)',
        borderRadius: '18px',
        padding: '16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        animation: 'pwa-install-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
        maxWidth: '420px',
        margin: '0 auto',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src="/icon-192.png"
            width={48}
            height={48}
            style={{ borderRadius: '12px', flexShrink: 0 }}
            alt="iRent icon"
          />
          <div>
            <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: '15px', lineHeight: 1.3 }}>
              Sakinisha iRent
            </div>
            <div style={{ color: 'var(--mid)', fontSize: '13px', marginTop: '2px' }}>
              Ongeza kwenye skrini yako ya nyumbani
            </div>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          aria-label="Funga"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--mid)', padding: '4px', borderRadius: '6px',
            flexShrink: 0,
          }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Feature chips */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {['⚡ Haraka zaidi', '📡 Inafanya kazi nje ya mtandao', '🔔 Arifa moja kwa moja'].map((chip) => (
          <span
            key={chip}
            style={{
              background: 'var(--cream, #f8fafc)',
              border: '1px solid var(--border)',
              borderRadius: '999px',
              padding: '3px 10px',
              fontSize: '12px',
              color: 'var(--ink)',
              fontWeight: 500,
            }}
          >
            {chip}
          </span>
        ))}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={handleDismiss}
          style={{
            flex: 1, padding: '10px', borderRadius: '10px',
            border: '1px solid var(--border)', background: '#fff',
            color: 'var(--mid)', cursor: 'pointer', fontWeight: 500,
            fontSize: '14px',
          }}
        >
          Sasa hivi siitaji
        </button>
        <button
          onClick={handleInstall}
          style={{
            flex: 2, padding: '10px', borderRadius: '10px',
            border: 'none', background: 'var(--jade)',
            color: '#fff', cursor: 'pointer', fontWeight: 600,
            fontSize: '14px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: '8px',
          }}
        >
          <Download size={16} />
          Sakinisha Bure
        </button>
      </div>

      <style>{`
        @keyframes pwa-install-in {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
