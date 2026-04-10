/**
 * Multitool Service Worker — network-first with versioned cache.
 *
 * CACHE_NAME is bumped on every deploy so the old cache is evicted
 * when the browser detects the new sw.js content. The fetch handler
 * uses a simple network-first strategy without body comparison —
 * the old approach read 2 x 9 MB strings and could OOM on iPad.
 */
const CACHE_NAME = 'multitool-v4.0.19';
const APP_URLS = [
  '/Multitool/',
  '/Multitool/index.html',
];

// Install — pre-cache the app shell, activate immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_URLS))
  );
  self.skipWaiting();
});

// Activate — delete ALL old caches (any name that isn't current)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch — network-first, cache fallback
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate' &&
      !APP_URLS.some((url) => event.request.url.endsWith(url))) {
    return;
  }

  event.respondWith(
    (async () => {
      try {
        const networkResponse = await fetch(event.request);
        if (networkResponse.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      } catch {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        const fallback = await caches.match('/Multitool/');
        if (fallback) return fallback;
        return new Response(
          '<!DOCTYPE html><html><body style="background:#0f1117;color:#e5e7eb;' +
          'font-family:system-ui;display:flex;align-items:center;justify-content:center;' +
          'min-height:100vh;margin:0"><div style="text-align:center">' +
          '<h1 style="color:#14B8A6">Multitool</h1>' +
          '<p>Offline — please reconnect and reload.</p></div></body></html>',
          { headers: { 'Content-Type': 'text/html' } }
        );
      }
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
