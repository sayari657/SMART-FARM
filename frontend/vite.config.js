import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
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

