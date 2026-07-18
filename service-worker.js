// RIDER UNITED - Service Worker
// 캐시 이름에 날짜/버전을 넣어두면, 나중에 index.html을 크게 바꿀 때
// 이 숫자만 올려주면(예: v2 -> v3) 예전 캐시가 자동으로 정리됩니다.
const CACHE_NAME = 'rider-united-v1';

// 자주 안 바뀌는 정적 파일만 캐시합니다.
// index.html은 일부러 넣지 않습니다 (항상 최신 내용을 받아오기 위함 - 이전에 겪었던
// "고쳤는데 화면에 반영이 안 된다" 문제를 서비스워커가 다시 만들지 않도록 하기 위함).
const STATIC_ASSETS = [
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // HTML 페이지(예: index.html)는 "네트워크 우선" -> 실패할 때만 캐시 사용.
  // 이렇게 해야 새로 배포한 내용이 항상 바로 반영됩니다.
  if (req.mode === 'navigate' || (req.method === 'GET' && req.headers.get('accept')?.includes('text/html'))) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Firebase 등 외부 API 요청은 그대로 네트워크로 흘려보냅니다 (캐시하지 않음).
  if (req.url.includes('firebaseio.com') || req.url.includes('googleapis.com')) {
    return;
  }

  // 아이콘/매니페스트 같은 정적 파일은 캐시 우선, 없으면 네트워크.
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req))
  );
});
