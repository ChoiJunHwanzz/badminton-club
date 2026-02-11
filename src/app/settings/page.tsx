'use client'

import { useState } from 'react'
import { Save, DollarSign, Users, Calendar } from 'lucide-react'

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    clubName: '배드민턴 클럽',
    monthlyFee: 20000,
    defaultLocation: '올림픽공원 체육관',
    courtCount: 3,
    meetingDays: ['saturday', 'wednesday'],
  })

  const handleSave = () => {
    alert('설정이 저장되었습니다!')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">설정</h1>
        <button onClick={handleSave} className="btn btn-primary flex items-center gap-2">
          <Save size={20} />
          저장
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 기본 정보 */}
        <div className="card">
          <h3 className="card-header flex items-center gap-2">
            <Users size={20} />
            동호회 정보
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                동호회 이름
              </label>
              <input
                type="text"
                className="input"
                value={settings.clubName}
                onChange={(e) => setSettings({ ...settings, clubName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                기본 장소
              </label>
              <input
                type="text"
                className="input"
                value={settings.defaultLocation}
                onChange={(e) => setSettings({ ...settings, defaultLocation: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                코트 수
              </label>
              <input
                type="number"
                className="input"
                value={settings.courtCount}
                onChange={(e) => setSettings({ ...settings, courtCount: Number(e.target.value) })}
              />
            </div>
          </div>
        </div>

        {/* 회비 설정 */}
        <div className="card">
          <h3 className="card-header flex items-center gap-2">
            <DollarSign size={20} />
            회비 설정
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                월 회비 (원)
              </label>
              <input
                type="number"
                className="input"
                value={settings.monthlyFee}
                onChange={(e) => setSettings({ ...settings, monthlyFee: Number(e.target.value) })}
              />
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                현재 설정된 월 회비: <span className="font-bold">{settings.monthlyFee.toLocaleString()}원</span>
              </p>
              <p className="text-sm text-gray-500 mt-1">
                24명 기준 월 수입: {(settings.monthlyFee * 24).toLocaleString()}원
              </p>
            </div>
          </div>
        </div>

        {/* 모임 일정 */}
        <div className="card">
          <h3 className="card-header flex items-center gap-2">
            <Calendar size={20} />
            정기 모임 요일
          </h3>
          <div className="space-y-2">
            {[
              { value: 'monday', label: '월요일' },
              { value: 'tuesday', label: '화요일' },
              { value: 'wednesday', label: '수요일' },
              { value: 'thursday', label: '목요일' },
              { value: 'friday', label: '금요일' },
              { value: 'saturday', label: '토요일' },
              { value: 'sunday', label: '일요일' },
            ].map((day) => (
              <label
                key={day.value}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer ${
                  settings.meetingDays.includes(day.value)
                    ? 'bg-emerald-50 border border-emerald-200'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <input
                  type="checkbox"
                  checked={settings.meetingDays.includes(day.value)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSettings({
                        ...settings,
                        meetingDays: [...settings.meetingDays, day.value]
                      })
                    } else {
                      setSettings({
                        ...settings,
                        meetingDays: settings.meetingDays.filter(d => d !== day.value)
                      })
                    }
                  }}
                  className="w-4 h-4 text-emerald-600"
                />
                <span className="font-medium">{day.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 데이터 관리 */}
        <div className="card">
          <h3 className="card-header">데이터 관리</h3>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-800">Supabase 연동</p>
              <p className="text-sm text-blue-600 mt-1">
                환경변수에서 Supabase URL과 Key를 설정하세요.
              </p>
            </div>
            <button className="btn btn-secondary w-full">
              데이터 내보내기 (CSV)
            </button>
            <button className="btn btn-danger w-full">
              데이터 초기화
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
