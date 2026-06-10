const CACHE_NAME = 'ddminton-v2'

// 설치 시 기본 리소스 캐싱
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        cache.addAll(['/manifest.json', '/icons/icon-192x192.png', '/icons/icon-512x512.png'])
      )
      .catch(() => {})
  )
  self.skipWaiting()
})

// 활성화 시 이전 캐시 삭제
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)))
    )
  )
  self.clients.claim()
})

// 정적 자산만 Network-First. 네비게이션/RSC/Next 내부/외부 요청은 가로채지 않는다.
self.addEventListener('fetch', (event) => {
  const req = event.request

  // GET + 동일 출처만 처리 (POST/supabase/외부는 브라우저 기본 처리)
  if (req.method !== 'GET') return
  let url
  try {
    url = new URL(req.url)
  } catch {
    return
  }
  if (url.origin !== self.location.origin) return

  // Next.js 내부/네비게이션/RSC/HMR/API는 절대 가로채지 않음 (이게 깨지면 페이지 이동/로그아웃이 망가짐)
  if (
    req.mode === 'navigate' ||
    req.headers.get('RSC') === '1' ||
    url.search.includes('_rsc=') ||
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/api/')
  ) {
    return
  }

  event.respondWith(
    fetch(req)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone()
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(req, clone))
            .catch(() => {})
        }
        return response
      })
      .catch(async () => {
        // respondWith에는 항상 Response를 넘긴다 (undefined 금지)
        const cached = await caches.match(req)
        return cached || Response.error()
      })
  )
})
