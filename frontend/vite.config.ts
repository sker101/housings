import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.png', 'icon-192x192.png', 'icon-512x512.png'],
      manifest: {
        name: 'iRent Tanzania',
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
  ],

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
    host: '0.0.0.0',
    port: 5173,
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
    setupFiles: './src/setupTests.js',
    css: true,
  },
});
