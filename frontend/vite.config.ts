import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  // Force Leaflet to be pre-bundled by Vite (fixes dynamic import failure in prod)
  optimizeDeps: {
    include: ['leaflet'],
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Keep Leaflet in its own stable chunk so the dynamic import() can resolve it
          leaflet: ['leaflet'],
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
