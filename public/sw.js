self.addEventListener('install', (event) => {
  // 강제로 즉시 새 서비스 워커 활성화
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    // 모든 캐시 삭제
    caches.keys().then((cacheNames) => {
      return Promise.all(cacheNames.map((name) => caches.delete(name)));
    }).then(() => {
      // 서비스 워커 자체 등록 해제
      return self.registration.unregister();
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// fetch 이벤트 무력화 (모든 요청을 네트워크로 바로 통과)
self.addEventListener('fetch', (event) => {
  // 아무 작업도 하지 않음
});
