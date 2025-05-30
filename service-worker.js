// service-worker.js

const CACHE_NAME = 'coating-app-cache-v2'; // ← v1 → v2로 변경
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  // data.csv 제외
];

self.addEventListener('install', evt => {
  // 새 SW가 설치되면 바로 활성화
  self.skipWaiting();
  evt.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('activate', evt => {
  // 기존 캐시 전부 제거
  evt.waitUntil(
    caches.keys().then(names =>
      Promise.all(
        names.filter(name => name !== CACHE_NAME)
             .map(name => caches.delete(name))
      )
    ).then(() => {
      // 새 SW가 페이지 컨트롤 즉시 시작하도록
      return self.clients.claim();
    })
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
