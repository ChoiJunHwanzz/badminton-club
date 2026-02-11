'use client'

import { Construction } from 'lucide-react'

export default function MatchesPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="bg-amber-50 rounded-full p-6 mb-6">
        <Construction size={64} className="text-amber-500" />
      </div>
      <h1 className="text-2xl font-bold text-gray-800 mb-3">대진표 기능 준비 중</h1>
      <p className="text-gray-500 max-w-md">
        대진표 자동 생성 및 경기 관리 기능을 개발 중입니다.
        <br />
        조금만 기다려 주세요!
      </p>
      <div className="mt-8 px-4 py-2 bg-gray-100 rounded-lg text-sm text-gray-600">
        예정 기능: 자동 대진 생성, 점수 기록, 경기 통계
      </div>
    </div>
  )
}
