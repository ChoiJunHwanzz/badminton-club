'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    // 개발 중에는 SW가 HMR/RSC 네비게이션을 깨뜨리므로 등록 해제
    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((r) => r.unregister()))
        .catch(() => {})
      return
    }

    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW 등록 실패 무시
    })
  }, [])

  return null
}
