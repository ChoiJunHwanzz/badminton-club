'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Users,
  UserPlus,
  CreditCard,
  Calendar,
  Trophy,
  LayoutDashboard,
  Settings,
  AlertTriangle,
  Target,
  ClipboardList,
  X
} from 'lucide-react'

const menuItems = [
  { href: '/', label: '대시보드', icon: LayoutDashboard },
  { href: '/members', label: '회원관리', icon: Users },
  { href: '/registrations', label: '신규회원관리', icon: UserPlus },
  { href: '/penalties', label: '당일취소/지각', icon: AlertTriangle },
  { href: '/payments', label: '회비관리', icon: CreditCard },
  { href: '/meetings', label: '모임관리', icon: Calendar },
  // { href: '/matches', label: '대진표', icon: Trophy },
  { href: '/tournament', label: '대진/시간표', icon: Trophy },
  { href: '/tournament/edit', label: '대회 관리', icon: ClipboardList },
  { href: '/scoreboard', label: '스코어보드', icon: Target },
  { href: '/settings', label: '설정', icon: Settings },
]

interface SidebarProps {
  isOpen?: boolean
  isMobile?: boolean
  onClose?: () => void
}

export default function Sidebar({ isOpen, isMobile, onClose }: SidebarProps) {
  const pathname = usePathname()

  // 데스크톱: 항상 표시
  // 모바일: isOpen일 때만 오버레이로 표시
  if (isMobile && !isOpen) {
    return null
  }

  return (
    <>
      {/* 모바일 오버레이 배경 */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* 사이드바 */}
      <aside
        className={`
          ${isMobile
            ? 'fixed left-0 top-0 h-full z-50 w-64 animate-slide-in'
            : 'w-52 relative'
          }
          bg-gray-900 text-white min-h-screen p-3
        `}
      >
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="text-xl font-bold py-3 flex items-center gap-2 hover:opacity-80 transition-opacity"
            onClick={onClose}
          >
            <span>🏸</span>
            <span>뚝딱민턴</span>
            <span>🏸</span>
          </Link>
          {isMobile && (
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="메뉴 닫기"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <nav className="space-y-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-emerald-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
