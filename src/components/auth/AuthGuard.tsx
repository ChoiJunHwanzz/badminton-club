'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getUser, User } from '@/lib/auth'

interface AuthGuardProps {
  children: React.ReactNode
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const [user, setUser] = useState<User | null>(null)
  const [checking, setChecking] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const currentUser = getUser()

    if (!currentUser && pathname !== '/login') {
      router.push('/login')
    } else if (currentUser && pathname === '/login') {
      router.push('/')
    } else {
      setUser(currentUser)
      setChecking(false)
    }
  }, [pathname, router])

  // 로그인 페이지는 바로 렌더링
  if (pathname === '/login') {
    return <>{children}</>
  }

  // 인증 확인 중
  if (checking) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  // 인증되지 않음
  if (!user) {
    return null
  }

  return <>{children}</>
}
