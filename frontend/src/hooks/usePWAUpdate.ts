import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

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

      // Check for update when user returns to the app
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          registration.update();
        }
      });

      // Check for update when device comes back online
      window.addEventListener('online', () => registration.update());
    },
    onRegisterError(error) {
      console.error('[PWA] SW registration error:', error);
    },
  });

  return { needRefresh, offlineReady, updateServiceWorker };
}
