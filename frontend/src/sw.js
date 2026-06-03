/**
 * Smart Farm AI — Service Worker v3
 * Workbox injectManifest strategy · Production only (disabled in dev)
 *
 * Cache strategy per domain:
 *   /api/v1/*       → NetworkFirst  (fresh data, 10 s timeout, fallback cache)
 *   images          → CacheFirst    (30 d TTL)
 *   fonts           → CacheFirst    (1 year TTL)
 *   OSM tiles       → StaleWhileRevalidate
 *   navigation      → SPA fallback to /index.html
 *   POST/PUT/PATCH  → NetworkOnly + BackgroundSync queue
 */

import {
  precacheAndRoute,
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
} from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import {
  NetworkFirst,
  CacheFirst,
  StaleWhileRevalidate,
  NetworkOnly,
} from 'workbox-strategies';
import { ExpirationPlugin }        from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { BackgroundSyncPlugin }    from 'workbox-background-sync';

/* ── Versioned cache prefix — bump to purge all caches on deploy ── */
const V = 'v3';

/* ══ Lifecycle ═════════════════════════════════════════════════════ */
self.skipWaiting();
self.addEventListener('activate', (evt) => {
  evt.waitUntil(
    /* Delete ALL caches not owned by this SW version */
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => !k.startsWith(V + '-') && k !== 'workbox-precache-v2')
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ══ Precache (Workbox injects __WB_MANIFEST at build time) ════════ */
try {
  precacheAndRoute(self.__WB_MANIFEST || []);
  cleanupOutdatedCaches();
} catch (e) {
  console.warn('[SW] precache error:', e);
}

/* ══ SPA navigation fallback ════════════════════════════════════════ */
try {
  registerRoute(
    new NavigationRoute(createHandlerBoundToURL('/index.html'), {
      denylist: [
        /^\/api\//,
        /^\/ws\//,
        /^\/offline/,
      ],
    })
  );
} catch (e) {
  console.warn('[SW] navigation route error:', e);
}

/* ══ BackgroundSync — mutations queued when offline ════════════════ */
let bgSync;
try {
  bgSync = new BackgroundSyncPlugin(`${V}-farm-mutations`, {
    maxRetentionTime: 24 * 60, // 24 h
  });
} catch (e) {
  console.warn('[SW] BackgroundSync init error:', e);
  bgSync = null;
}

/* ══ Mutations: POST/PUT/PATCH — NetworkOnly + queue offline ═══════ */
const MUTATION_METHODS = ['POST', 'PUT', 'PATCH'];
MUTATION_METHODS.forEach(method => {
  try {
    registerRoute(
      ({ url, request }) =>
        url.pathname.startsWith('/api/') &&
        request.method === method,
      new NetworkOnly({ plugins: bgSync ? [bgSync] : [] }),
      method
    );
  } catch (e) {
    console.warn(`[SW] mutation route (${method}) error:`, e);
  }
});

/* ══ General API GETs — NetworkFirst 10 s timeout ═════════════════ */
try {
  registerRoute(
    ({ url, request }) =>
      url.pathname.startsWith('/api/') && request.method === 'GET',
    new NetworkFirst({
      cacheName: `${V}-api`,
      networkTimeoutSeconds: 10,
      plugins: [
        new CacheableResponsePlugin({ statuses: [0, 200] }),
        new ExpirationPlugin({
          maxEntries: 120,
          maxAgeSeconds: 12 * 60 * 60, // 12 h
          purgeOnQuotaError: true,
        }),
      ],
    }),
    'GET'
  );
} catch (e) {
  console.warn('[SW] API-GET route error:', e);
}

/* ══ Google Fonts CSS — StaleWhileRevalidate ═══════════════════════ */
try {
  registerRoute(
    ({ url }) => url.origin === 'https://fonts.googleapis.com',
    new StaleWhileRevalidate({
      cacheName: `${V}-gfonts-css`,
      plugins: [
        new CacheableResponsePlugin({ statuses: [0, 200] }),
        new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }),
      ],
    })
  );
} catch (e) {
  console.warn('[SW] Google Fonts CSS route error:', e);
}

/* ══ Google Fonts files — CacheFirst ══════════════════════════════ */
try {
  registerRoute(
    ({ url }) => url.origin === 'https://fonts.gstatic.com',
    new CacheFirst({
      cacheName: `${V}-gfonts-files`,
      plugins: [
        new CacheableResponsePlugin({ statuses: [0, 200] }),
        new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }),
      ],
    })
  );
} catch (e) {
  console.warn('[SW] Google Fonts files route error:', e);
}

/* ══ OpenStreetMap tiles — StaleWhileRevalidate ════════════════════ */
try {
  registerRoute(
    ({ url }) => url.hostname === 'tile.openstreetmap.org',
    new StaleWhileRevalidate({
      cacheName: `${V}-osm-tiles`,
      plugins: [
        new ExpirationPlugin({
          maxEntries: 500,
          maxAgeSeconds: 30 * 24 * 60 * 60,
          purgeOnQuotaError: true,
        }),
      ],
    })
  );
} catch (e) {
  console.warn('[SW] OSM tiles route error:', e);
}

/* ══ Local map tiles ════════════════════════════════════════════════ */
try {
  registerRoute(
    ({ url }) => url.pathname.startsWith('/map-tiles/'),
    new StaleWhileRevalidate({
      cacheName: `${V}-local-tiles`,
      plugins: [
        new ExpirationPlugin({
          maxEntries: 500,
          maxAgeSeconds: 7 * 24 * 60 * 60,
          purgeOnQuotaError: true,
        }),
      ],
    })
  );
} catch (e) {
  console.warn('[SW] local tiles route error:', e);
}

/* ══ Images — CacheFirst (30 days) ════════════════════════════════ */
try {
  registerRoute(
    ({ request }) => request.destination === 'image',
    new CacheFirst({
      cacheName: `${V}-images`,
      plugins: [
        new CacheableResponsePlugin({ statuses: [0, 200] }),
        new ExpirationPlugin({
          maxEntries: 200,
          maxAgeSeconds: 30 * 24 * 60 * 60,
          purgeOnQuotaError: true,
        }),
      ],
    })
  );
} catch (e) {
  console.warn('[SW] image route error:', e);
}

/* ══ Web Push — receive & display ══════════════════════════════════ */
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch { data = { title: 'Smart Farm AI', body: event.data.text() }; }

  const title   = data.title || 'Smart Farm AI';
  const options = {
    body:    data.body    || '',
    icon:    data.icon    || '/icons/icon-192.png',
    badge:   data.badge   || '/icons/icon-72.png',
    tag:     data.tag     || 'smart-farm-notif',
    data:    data.data    || {},
    vibrate: [200, 100, 200],
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

/* ══ Notification click — focus/open app ═══════════════════════════ */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/dashboard';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate?.(url);
          return;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});

/* ══ Message handler ═══════════════════════════════════════════════ */
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();

  /* Force cache clear on demand */
  if (event.data?.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
        .then(() => event.source?.postMessage?.({ type: 'CACHE_CLEARED' }))
    );
  }
});
