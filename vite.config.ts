import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        // Force the new SW to take control immediately on update
        injectRegister: 'auto',
        workbox: {
          // Skip waiting so new SW activates the moment it's installed
          skipWaiting: true,
          clientsClaim: true,
          // NetworkFirst for all app shell assets:
          // Always tries the network first → picks up new deploys immediately.
          // Falls back to cache only if offline (timeout 5s).
          runtimeCaching: [
            {
              // HTML + JS + CSS → NetworkFirst
              urlPattern: ({ request }: { request: Request }) =>
                request.destination === 'document' ||
                request.destination === 'script'  ||
                request.destination === 'style',
              handler: 'NetworkFirst' as const,
              options: {
                cacheName: 'app-shell-v2',
                networkTimeoutSeconds: 5,
                expiration: {
                  maxEntries: 80,
                  maxAgeSeconds: 24 * 60 * 60, // 1 day
                },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // Images & fonts → CacheFirst (stable assets)
              urlPattern: ({ request }: { request: Request }) =>
                request.destination === 'image' ||
                request.destination === 'font',
              handler: 'CacheFirst' as const,
              options: {
                cacheName: 'static-assets-v1',
                expiration: {
                  maxEntries: 60,
                  maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
                },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
        manifest: {
          name: 'AM Manager',
          short_name: 'AM Manager',
          description: 'Gestión Integral de Equipos Deportivos',
          theme_color: '#121215',
          background_color: '#121215',
          display: 'standalone',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        },
        devOptions: {
          enabled: false, // No SW en dev → evita caché obsoleta durante desarrollo
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify — file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
