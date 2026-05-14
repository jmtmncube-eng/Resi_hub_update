/* ============================================================
 *  ResiHub service worker
 * ============================================================
 *  Deliberately minimal — no build-step integration, no precaching of
 *  hashed bundles. It makes the app installable and gives a graceful
 *  offline fallback, without risking stale-asset bugs:
 *
 *    • navigations   → network-first, fall back to the cached shell
 *    • static assets → stale-while-revalidate (same-origin GET only)
 *    • /api/*        → never touched (always live)
 *
 *  Bump CACHE to invalidate everything on the next activate.
 * ============================================================ */
const CACHE = 'resihub-v1';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg', '/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;   // leave cross-origin alone
  if (url.pathname.startsWith('/api')) return;        // API is always live

  // Navigations — network-first so users get fresh HTML; the cached
  // shell is the offline fallback.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html')),
    );
    return;
  }

  // Same-origin static assets — serve cache immediately, refresh in the
  // background.
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetched = fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetched;
    }),
  );
});
