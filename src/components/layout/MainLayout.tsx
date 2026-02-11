'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import Header from './Header'
import AuthGuard from '@/components/auth/AuthGuard'

interface MainLayoutProps {
  children: React.ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/login'
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // 화면 크기 감지
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth >= 768) {
        setSidebarOpen(false)
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // 페이지 이동 시 모바일 사이드바 닫기
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false)
    }
  }, [pathname, isMobile])

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen)
  const closeSidebar = () => setSidebarOpen(false)

  // 로그인 페이지는 레이아웃 없이 렌더링
  if (isLoginPage) {
    return <>{children}</>
  }

  // 다크 테마 페이지 여부
  const isDarkPage = pathname === '/matches'

  // 일반 페이지는 사이드바 + 헤더 + AuthGuard 적용
  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar
          isOpen={sidebarOpen}
          isMobile={isMobile}
          onClose={closeSidebar}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <Header
            onMenuClick={toggleSidebar}
            isMobile={isMobile}
          />
          <main className={`flex-1 p-4 md:p-6 overflow-auto ${isDarkPage ? 'bg-slate-900' : 'bg-gray-50'}`}>
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
