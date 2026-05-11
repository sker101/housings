import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';
  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        // Disable SW in dev — it causes false offline triggers when testing locally
        devOptions: {
          enabled: false,
        },
        includeAssets: [
          'favicon.ico',
          'apple-touch-icon.png',
          'icon-192.png',
          'icon-512.png',
        ],
        manifest: {
          name: 'iRent — Pata Nyumba Haraka',
          short_name: 'iRent',
          description: 'Tafuta, orodhesha, na simamia nyumba za kupanga Tanzania.',
          theme_color: '#16a34a',
          background_color: '#f9fafb',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          lang: 'sw',
          categories: ['lifestyle', 'business'],
          icons: [
            {
              src: '/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
            {
              src: '/apple-touch-icon.png',
              sizes: '180x180',
              type: 'image/png',
            },
          ],
          shortcuts: [
            {
              name: 'Tafuta Nyumba',
              short_name: 'Tafuta',
              url: '/listings',
              description: 'Tafuta nyumba za kupanga',
            },
            {
              name: 'Dashibodi ya Mwenye Nyumba',
              short_name: 'Dashibodi',
              url: '/landlord/dashboard',
              description: 'Simamia nyumba zako',
            },
          ],
          screenshots: [
            {
              src: '/pwa-header.png',
              sizes: '1200x628',
              type: 'image/png',
              label: 'iRent — Ukurasa Mkuu',
            },
          ],
        },
        workbox: {
          skipWaiting: true,
          clientsClaim: true,
          cleanupOutdatedCaches: true,

          // ── SPA routing fix ───────────────────────────────────────────────
          // MUST be /index.html — this is what the browser needs for React
          // Router to work on all routes (/login, /tenant/dashboard, etc.).
          // Using /offline.html here was the bug: it served the offline screen
          // for every route not in the pre-cache, even with full network.
          navigateFallback: '/index.html',

          // Never intercept Supabase, service-worker, or API requests
          navigateFallbackDenylist: [
            /^\/api/,
            /^\/supabase/,
            /^\/sw\.js/,
            /^\/workbox-/,
          ],
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
          runtimeCaching: [
            {
              // Supabase API — network first, 24h cache
              urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'supabase-cache',
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
                networkTimeoutSeconds: 10,
              },
            },
            {
              // Images — cache first, 30 days
              urlPattern: /\.(?:png|jpg|jpeg|svg|webp|ico)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'images-cache',
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            {
              // Google Fonts stylesheet
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: { cacheName: 'google-fonts-stylesheet' },
            },
            {
              // Google Fonts files
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
            {
              // ── Offline fallback for navigation requests ───────────────
              // This is the ONLY place /offline.html is served.
              // It fires only when a navigation fetch truly fails (network
              // error / timeout) — not for unknown SPA routes.
              urlPattern: ({ request }) => request.mode === 'navigate',
              handler: 'NetworkOnly',
              options: {
                cacheName: 'navigation-cache',
                plugins: [
                  {
                    // If the network fetch fails, serve offline.html
                    fetchDidFail: async () => {
                      return caches.match('/offline.html');
                    },
                  },
                ],
              },
            },
          ],
        },
      }),
    ].filter(Boolean),

    // Force Mapbox to be pre-bundled by Vite
    optimizeDeps: {
      include: ['mapbox-gl'],
    },

    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // Keep Mapbox in its own stable chunk
            mapbox: ['mapbox-gl'],
          },
        },
      },
    },

    server: {
      host: process.env.VITE_DEV_HOST || '0.0.0.0',
      port: process.env.VITE_DEV_PORT ? Number(process.env.VITE_DEV_PORT) : 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: process.env.VITE_DEV_API_PROXY_TARGET || 'http://localhost:8081',
          changeOrigin: true,
        },
      },
    },

    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.tsx',
      css: true,
    },
  };
});
