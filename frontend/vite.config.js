import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'fs'
import path from 'path'

// mkcert certs — generated with: mkcert -key-file certs/key.pem -cert-file certs/cert.pem 192.168.0.9 localhost 127.0.0.1
function loadCerts() {
  const keyPath = path.resolve(__dirname, 'certs/key.pem')
  const certPath = path.resolve(__dirname, 'certs/cert.pem')
  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    return { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) }
  }
  return undefined  // fall back to HTTP if certs not generated yet
}

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.js',
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      strategies: 'injectManifest',   // use custom src/sw.js instead of generateSW
      srcDir: 'src',
      filename: 'sw.js',
      devOptions: {
        enabled: false,   // SW disabled in dev — bare workbox imports break without bundling
      },
      manifest: {
        name: "Smart Farm AI",
        short_name: "FarmAI",
        description: "Plateforme agricole intelligente — Monitoring temps réel, IA prédictive, gestion du bétail.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        display_override: ["standalone", "minimal-ui", "browser"],
        orientation: "any",
        theme_color: "#16a34a",
        background_color: "#0f172a",
        lang: "fr",
        prefer_related_applications: false,
        categories: ["agriculture", "business", "productivity"],
        icons: [
          { src: "/icons/icon-72.png",  sizes: "72x72",   type: "image/png" },
          { src: "/icons/icon-96.png",  sizes: "96x96",   type: "image/png" },
          { src: "/icons/icon-128.png", sizes: "128x128", type: "image/png" },
          { src: "/icons/icon-144.png", sizes: "144x144", type: "image/png" },
          { src: "/icons/icon-152.png", sizes: "152x152", type: "image/png" },
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-384.png", sizes: "384x384", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ],
        shortcuts: [
          { name: "Scanner IA",   short_name: "Scanner", url: "/worker/scan",   icons: [{ src: "/icons/icon-96.png", sizes: "96x96" }] },
          { name: "Mes Tâches",   short_name: "Tâches",  url: "/worker/tasks",  icons: [{ src: "/icons/icon-96.png", sizes: "96x96" }] },
          { name: "Worker Home",  short_name: "Worker",  url: "/worker",        icons: [{ src: "/icons/icon-96.png", sizes: "96x96" }] },
          { name: "Dashboard",    short_name: "Dash",    url: "/dashboard",     icons: [{ src: "/icons/icon-96.png", sizes: "96x96" }] }
        ],
        screenshots: [
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', form_factor: 'narrow',  label: 'Smart Farm AI — Terrain mobile' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', form_factor: 'wide',    label: 'Smart Farm AI — Dashboard' },
        ],
        id: '/smart-farm-ai',   /* stable PWA identity — required for re-install detection */
        protocol_handlers: []
      },
      injectManifest: {
        // Exclude large monitoring images (+800 KB each) — loaded lazily, not needed at install
        globIgnores: [
          '**/goat_monitoring_ia.png',
          '**/poultry_monitoring_ia.png',
          '**/rabbit_monitoring_ia.png',
          '**/sheep_monitoring_ia.png',
          '**/sw-offline-sync.js',          // dead file removed
          '**/models/**',                   // 3D GLB models — too large
          '**/models designe/**',
        ],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,jpg,jpeg,woff2}'],
        maximumFileSizeToCacheInBytes: 5000000,   // 5 MB max per file (was 12 MB)
      }
    })
  ],
  preview: {
    port: 5173,       // same port as dev — workers access https://192.168.0.9:5173/worker-login
    host: true,
    https: loadCerts(),
    allowedHosts: ['prudishly-stuffy-purebred.ngrok-free.dev'],
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            if (res && !res.headersSent) {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ detail: 'Backend offline', code: err.code }));
            }
          });
        },
      },
      '/ws': { target: 'ws://127.0.0.1:8000', ws: true, changeOrigin: true },
    },
  },
  server: {
    port: 5173,
    host: true,
    https: loadCerts(),
    allowedHosts: ['prudishly-stuffy-purebred.ngrok-free.dev'],
    proxy: {
      // REST API — all /api calls forwarded to FastAPI backend on :8000
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            // Backend not running → return clean JSON 503 instead of crashing
            console.warn(`[proxy] Backend unreachable (${err.code}). Start the backend: cd backend && python -m uvicorn app.main:app --reload`);
            if (res && !res.headersSent) {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                detail: 'Backend server is offline. Run: cd backend && python -m uvicorn app.main:app --reload',
                code: err.code,
              }));
            }
          });
        },
      },
      // WebSocket — live telemetry & alerts
      '/ws': {
        target: 'ws://127.0.0.1:8000',
        ws: true,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.warn(`[proxy/ws] Backend WebSocket unreachable (${err.code})`);
          });
        },
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

