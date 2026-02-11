'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { LogOut, User, Menu } from 'lucide-react'
import { getUser, logout, User as UserType } from '@/lib/auth'

interface HeaderProps {
  onMenuClick?: () => void
  isMobile?: boolean
}

export default function Header({ onMenuClick, isMobile }: HeaderProps) {
  const pathname = usePathname()
  const [user, setUser] = useState<UserType | null>(null)

  // 다크 테마 페이지 여부
  const isDarkPage = pathname === '/matches'

  useEffect(() => {
    setUser(getUser())
  }, [])

  const handleLogout = () => {
    if (confirm('로그아웃 하시겠습니까?')) {
      logout()
    }
  }

  return (
    <header className={`h-14 md:h-16 px-4 md:px-6 flex items-center justify-between border-b ${
      isDarkPage
        ? 'bg-slate-800 border-slate-700'
        : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-center gap-3">
        {isMobile && (
          <button
            onClick={onMenuClick}
            className={`p-2 -ml-2 rounded-lg transition-colors ${
              isDarkPage
                ? 'text-slate-300 hover:bg-slate-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            aria-label="메뉴 열기"
          >
            <Menu size={24} />
          </button>
        )}
        {isMobile && (
          <span className={`text-lg font-bold ${isDarkPage ? 'text-white' : 'text-gray-800'}`}>
            🏸 뚝딱민턴
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <div className={`flex items-center gap-2 ${isDarkPage ? 'text-slate-300' : 'text-gray-600'}`}>
          <User size={18} className="hidden md:block" />
          <span className="text-sm font-medium">{user?.name || '사용자'}</span>
          <span className={`text-xs hidden md:inline ${isDarkPage ? 'text-slate-500' : 'text-gray-400'}`}>
            ({user?.role === 'admin' ? '관리자' : '운영진'})
          </span>
        </div>
        <button
          onClick={handleLogout}
          className={`flex items-center gap-1 md:gap-2 p-2 rounded-lg transition-colors ${
            isDarkPage
              ? 'text-slate-400 hover:text-red-400 hover:bg-slate-700'
              : 'text-gray-500 hover:text-red-600 hover:bg-red-50'
          }`}
          title="로그아웃"
        >
          <LogOut size={18} />
          <span className="text-sm hidden md:inline">로그아웃</span>
        </button>
      </div>
    </header>
  )
}
