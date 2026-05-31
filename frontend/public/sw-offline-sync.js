/**
 * Smart Farm AI — Offline Sync Service Worker
 * Queues failed POST/PATCH requests when offline and replays them on reconnect.
 * Used by field workers scanning animals without internet.
 */

const SYNC_TAG    = 'smart-farm-sync';
const QUEUE_KEY   = 'offline_request_queue';
const CACHE_NAME  = 'smart-farm-v3-offline';
const API_PREFIX  = '/api/';

// Install — pre-cache worker shell pages
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(['/offline.html', '/'])
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Fetch — intercept API calls
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only intercept our API
  if (!url.pathname.startsWith(API_PREFIX)) return;

  // For mutating requests, queue when offline
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    event.respondWith(
      fetch(request.clone()).catch(async () => {
        // Offline → queue the request
        const body = await request.text().catch(() => '');
        const queued = {
          id:        Date.now(),
          url:       request.url,
          method:    request.method,
          headers:   Object.fromEntries(request.headers.entries()),
          body,
          queued_at: new Date().toISOString(),
        };
        const queue = await _getQueue();
        queue.push(queued);
        await _saveQueue(queue);

        // Register background sync
        if ('sync' in self.registration) {
          await self.registration.sync.register(SYNC_TAG);
        }

        return new Response(
          JSON.stringify({ offline: true, queued: true, id: queued.id }),
          { status: 202, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // GET — network first, fallback to cache
  event.respondWith(
    fetch(request).catch(() =>
      caches.match(request).then((cached) =>
        cached || new Response('{"offline":true}',
          { status: 503, headers: { 'Content-Type': 'application/json' } })
      )
    )
  );
});

// Background sync — replay queued requests
self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(_replayQueue());
  }
});

async function _getQueue() {
  const cache  = await caches.open(CACHE_NAME);
  const stored = await cache.match(QUEUE_KEY);
  if (!stored) return [];
  try { return await stored.json(); } catch { return []; }
}

async function _saveQueue(queue) {
  const cache = await caches.open(CACHE_NAME);
  await cache.put(
    QUEUE_KEY,
    new Response(JSON.stringify(queue), { headers: { 'Content-Type': 'application/json' } })
  );
}

async function _replayQueue() {
  const queue   = await _getQueue();
  const failed  = [];

  for (const req of queue) {
    try {
      const resp = await fetch(req.url, {
        method:  req.method,
        headers: req.headers,
        body:    req.body || undefined,
      });
      if (!resp.ok) failed.push(req);
    } catch {
      failed.push(req);
    }
  }

  await _saveQueue(failed);

  // Notify open tabs
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach((c) =>
    c.postMessage({ type: 'SYNC_COMPLETE', replayed: queue.length - failed.length, failed: failed.length })
  );
}
