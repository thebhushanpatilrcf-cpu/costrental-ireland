const CACHE_NAME = 'costrental-v2';
const ASSETS = [
  '/',
  '/css/style.css',
  '/js/app.js',
  '/data/listings.json',
  '/data/students.json',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
