const CACHE_NAME = 'ddminton-v1'

// 설치 시 기본 리소스 캐싱
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/manifest.json',
        '/icons/icon-192x192.png',
        '/icons/icon-512x512.png',
      ])
    })
  )
  self.skipWaiting()
})

// 활성화 시 이전 캐시 삭제
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      )
    })
  )
  self.clients.claim()
})

// 네트워크 우선, 실패 시 캐시 (Network First 전략)
self.addEventListener('fetch', (event) => {
  // API 요청은 캐시하지 않음
  if (event.request.url.includes('/api/') || event.request.url.includes('supabase')) {
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 성공 응답을 캐시에 저장
        if (response.status === 200) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone)
          })
        }
        return response
      })
      .catch(() => {
        // 오프라인 시 캐시에서 반환
        return caches.match(event.request)
      })
  )
})
