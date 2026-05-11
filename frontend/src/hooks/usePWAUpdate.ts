import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

/** True when running as an installed PWA (standalone on phone/desktop) */
export function isInstalledPWA(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    // iOS Safari standalone
    (window.navigator as any).standalone === true
  );
}

/** True on a touch mobile device */
export function isMobileDevice(): boolean {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
    navigator.maxTouchPoints > 1;
}

export function usePWAUpdate() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
    offlineReady: [offlineReady],
  } = useRegisterSW({
    onRegistered(registration) {
      if (!registration) return;

      // Poll for updates every 60 seconds while app is open
      setInterval(() => registration.update(), 60_000);

      // Check on tab focus (user comes back to app)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') registration.update();
      });

      // Check when device comes back online
      window.addEventListener('online', () => registration.update());
    },
    onRegisterError(error) {
      console.error('[PWA] SW registration error:', error);
    },
  });

  // ── BROWSER (non-installed): silently auto-apply the update ──────────────
  // On desktop/browser we don't interrupt the user — just reload when a new
  // SW is ready. The page reloads in the background; users see the new version
  // on their next navigation.
  useEffect(() => {
    if (needRefresh && !isInstalledPWA()) {
      // Small delay so the current navigation completes first
      const t = setTimeout(() => updateServiceWorker(true), 3_000);
      return () => clearTimeout(t);
    }
  }, [needRefresh]);

  return { needRefresh, offlineReady, updateServiceWorker };
}
