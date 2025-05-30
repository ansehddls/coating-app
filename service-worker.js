// service-worker.js

const CACHE_NAME = 'coating-app-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  // data.csv는 캐싱하지 않습니다
];

self.addEventListener('install', evt => {
  evt.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('fetch', evt => {
  const url = new URL(evt.request.url);

  // data.csv 요청은 network-first
  if (url.pathname.endsWith('/data.csv')) {
    evt.respondWith(
      fetch(evt.request).catch(() => caches.match(evt.request))
    );
    return;
  }

  // 그 외는 cache-first
  evt.respondWith(
    caches.match(evt.request)
      .then(cached => cached || fetch(evt.request))
  );
});
