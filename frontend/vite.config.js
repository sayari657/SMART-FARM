import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      devOptions: {
        enabled: true,
        type: 'module',
      },
      manifest: {
        name: "Smart Farm AI",
        short_name: "FarmAI",
        description: "Plateforme agricole intelligente — Tunisian Sovereign AI",
        start_url: "/",
        display: "standalone",
        orientation: "portrait",
        theme_color: "#16a34a",
        background_color: "#0f172a",
        lang: "fr",
        icons: [
          { src: "/icons/icon-72.png", sizes: "72x72", type: "image/png" },
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" }
        ],
        shortcuts: [
          { name: "Scanner IA", url: "/worker/scan", icons: [{src: "/icons/scan.png", sizes: "96x96"}] },
          { name: "Mes Tâches", url: "/worker/tasks", icons: [{src: "/icons/tasks.png", sizes: "96x96"}] },
          { name: "Dashboard", url: "/dashboard", icons: [{src: "/icons/dash.png", sizes: "96x96"}] }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        maximumFileSizeToCacheInBytes: 10000000,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'gstatic-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } }
          },
          {
            urlPattern: /\/api\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-cache', expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 } }
          }
        ]
      }
    })
  ],
  preview: {
    port: 4173,
    host: true,
    proxy: {
      '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/ws':  { target: 'ws://127.0.0.1:8000', ws: true, changeOrigin: true },
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      // REST API — all /api calls go through backend. No CORS needed.
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
      // WebSocket — live telemetry & alerts
      '/ws': {
        target: 'ws://127.0.0.1:8000',
        ws: true,
        changeOrigin: true,
      },
      // Local vector tile server (optional, 503 if offline — fallback to OSM)
      '/map-tiles': {
        target: 'http://localhost:9090',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/map-tiles/, ''),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, res) => {
            console.warn('Proxy error for map tiles:', err.code);
            if (!res.headersSent) {
              res.writeHead(503, { 'Content-Type': 'text/plain' });
              res.end('Map TileServer Offline — OSM fallback active');
            }
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            // Suppress the WWW-Authenticate header to stop the browser login popup
            if (proxyRes.statusCode === 401) {
              delete proxyRes.headers['www-authenticate'];
            }
          });
        },
      },
    },
  },
})

