import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';
  return {
    plugins: [
      react(),
      // Only enable PWA in production mode to prevent dev redirects
      isProd && VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.png', 'icon-192x192.png', 'icon-512x512.png'],
        manifest: {
          name: 'iRent',
          short_name: 'iRent',
          description: "Tanzania's trusted property rental marketplace. Find verified rooms in Dar es Salaam — Msasani, Masaki, Upanga and beyond.",
          theme_color: '#22c55e',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: 'icon-192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,jpeg,ico}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true
      }
      })
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
      // Use environment overrides when available so you can run on different
      // local ports without editing this file. Default to 0.0.0.0 so LAN devices can connect.
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
      // Use the actual setup file used in the project
      setupFiles: './src/setupTests.tsx',
      css: true,
    },
  };
});
