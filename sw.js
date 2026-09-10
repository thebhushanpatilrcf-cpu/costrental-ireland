// Network-first service worker. The site updates its listings frequently, so we
// always try the network first and only fall back to cache when offline. This
// prevents the "stale page after an update" problem (no more forced hard refreshes).
const CACHE_NAME = 'costrental-v4';

// Minimal offline fallback shell. We do NOT precache app.js/data so the browser
// always fetches the latest versions from the network while online.
const OFFLINE_ASSETS = ['/', '/css/style.css'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(OFFLINE_ASSETS)));
});

// Drop every older cache version on activate, then take control immediately.
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-first for GET requests: serve fresh content, cache a copy for offline,
// and only fall back to cache if the network fails. Data files are never cached.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  if (url.pathname.includes('/data/')) {
    e.respondWith(fetch(e.request));
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then(resp => {
        // Cache same-origin successful responses for offline use.
        if (resp && resp.ok && url.origin === self.location.origin) {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, copy));
        }
        return resp;
      })
      .catch(() => caches.match(e.request))
  );
});
