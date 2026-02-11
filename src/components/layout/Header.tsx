'use client'

import { useEffect, useState } from 'react'
import { LogOut, User, Menu } from 'lucide-react'
import { getUser, logout, User as UserType } from '@/lib/auth'

interface HeaderProps {
  onMenuClick?: () => void
  isMobile?: boolean
}

export default function Header({ onMenuClick, isMobile }: HeaderProps) {
  const [user, setUser] = useState<UserType | null>(null)

  useEffect(() => {
    setUser(getUser())
  }, [])

  const handleLogout = () => {
    if (confirm('로그아웃 하시겠습니까?')) {
      logout()
    }
  }

  return (
    <header className="h-14 md:h-16 bg-white border-b border-gray-200 px-4 md:px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {isMobile && (
          <button
            onClick={onMenuClick}
            className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="메뉴 열기"
          >
            <Menu size={24} />
          </button>
        )}
        {isMobile && (
          <span className="text-lg font-bold text-gray-800">🏸 뚝딱민턴</span>
        )}
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <div className="flex items-center gap-2 text-gray-600">
          <User size={18} className="hidden md:block" />
          <span className="text-sm font-medium">{user?.name || '사용자'}</span>
          <span className="text-xs text-gray-400 hidden md:inline">
            ({user?.role === 'admin' ? '관리자' : '운영진'})
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1 md:gap-2 p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="로그아웃"
        >
          <LogOut size={18} />
          <span className="text-sm hidden md:inline">로그아웃</span>
        </button>
      </div>
    </header>
  )
}
