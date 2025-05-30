// service-worker.js

const CACHE_NAME = 'coating-app-cache-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  // data.csv, update-csv 는 캐싱하지 않습니다
];

self.addEventListener('install', evt => {
  self.skipWaiting();
  evt.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('activate', evt => {
  evt.waitUntil(
    caches.keys().then(names =>
      Promise.all(names
        .filter(n => n !== CACHE_NAME)
        .map(n => caches.delete(n))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', evt => {
  const url = new URL(evt.request.url);

  // 1) data.csv 요청은 network-first
  if (url.pathname.endsWith('/data.csv')) {
    evt.respondWith(
      fetch(evt.request).catch(() => caches.match(evt.request))
    );
    return;
  }

  // 2) Netlify Function 호출(/.netlify/functions/) 도 network-first
  if (url.pathname.startsWith('/.netlify/functions/')) {
    evt.respondWith(
      fetch(evt.request).catch(() => caches.match(evt.request))
    );
    return;
  }

  // 3) 그 외 정적 에셋은 cache-first
  evt.respondWith(
    caches.match(evt.request)
      .then(cached => cached || fetch(evt.request))
  );
});
