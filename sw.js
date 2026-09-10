const CACHE_NAME = 'costrental-v3';
// Only precache the static shell. Data files (listings/students/etc.) are
// intentionally excluded so fresh listings always load from the network.
const ASSETS = [
  '/',
  '/css/style.css',
  '/js/app.js',
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});

// Remove old caches (e.g. costrental-v2) so stale data can't be served.
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Always fetch JSON data fresh from the network; never serve it from cache.
  if (url.pathname.includes('/data/')) {
    e.respondWith(fetch(e.request));
    return;
  }
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
