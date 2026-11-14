import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// base './' supaya jalan di GitHub Pages (subfolder) maupun di dalam Capacitor.
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Pelita — Jurnal Trading',
        short_name: 'Pelita',
        description: 'Catat, tinjau, dan pahami trading kamu.',
        lang: 'id',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#151412',
        theme_color: '#151412',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' }
        ]
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,woff2}'] }
    })
  ],
  test: { include: ['tests/unit/**/*.test.ts'], environment: 'node' }
});
