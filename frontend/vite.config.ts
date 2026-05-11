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
        // Enable SW in dev so we can test offline/update banners
        devOptions: {
          enabled: true,
          type: 'module',
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
          // Navigate fallback for offline SPA routing
          navigateFallback: '/offline.html',
          navigateFallbackDenylist: [/^\/api/, /^\/supabase/, /^\/sw\.js/],
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
