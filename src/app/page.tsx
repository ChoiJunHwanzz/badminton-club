'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Users, CreditCard, Calendar, UserCheck, MapPin, Clock, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { Member } from '@/types/database'

// 요일 정보 (화목금토일)
const MEETING_DAYS = [
  { key: 'tue', label: '화', fullLabel: '화요일', dayOfWeek: 2 },
  { key: 'thu', label: '목', fullLabel: '목요일', dayOfWeek: 4 },
  { key: 'fri', label: '금', fullLabel: '금요일', dayOfWeek: 5 },
  { key: 'sat', label: '토', fullLabel: '토요일', dayOfWeek: 6 },
  { key: 'sun', label: '일', fullLabel: '일요일', dayOfWeek: 0 },
]

type StaffStatus = 'attending' | 'pending' | 'absent'

type Meeting = {
  id: string
  date: string
  location: string
  startTime: string
  endTime: string
  attendees: number
  staffAttendance: { memberId: string; status: StaffStatus }[]
}

// 이번 주 특정 요일의 날짜 구하기 (한국식: 월-일)
const getThisWeekDate = (dayOfWeek: number) => {
  const today = new Date()
  const currentDay = today.getDay()
  const adjustedDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek
  const adjustedCurrentDay = currentDay === 0 ? 7 : currentDay
  const diff = adjustedDayOfWeek - adjustedCurrentDay
  const targetDate = new Date(today)
  targetDate.setDate(today.getDate() + diff)
  return targetDate.toISOString().split('T')[0]
}

// 날짜 포맷
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

// 시간 포맷
const formatTime = (timeStr: string) => {
  if (!timeStr) return ''
  return timeStr.substring(0, 5)
}

// 현재 월
const getCurrentMonth = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default function Dashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState<Member[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [staffMembers, setStaffMembers] = useState<Member[]>([])
  const [unpaidMembers, setUnpaidMembers] = useState<{ member: Member; amount: number }[]>([])

  const supabase = createClient()

  // 데이터 조회
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)

      // 회원 조회
      const { data: membersData } = await supabase
        .from('members')
        .select('*')
        .eq('status', 'active')

      if (membersData) {
        setMembers(membersData)
      }

      // 운영진 조회
      const { data: staffData } = await supabase
        .from('members')
        .select('*')
        .in('role', ['leader', 'staff'])
        .eq('status', 'active')

      if (staffData) {
        setStaffMembers(staffData)
      }

      // 모임 조회
      const { data: meetingsData } = await supabase
        .from('meetings')
        .select('*')
        .order('meeting_date', { ascending: false })

      if (meetingsData) {
        const mapped = meetingsData.map((m: any) => ({
          id: m.id,
          date: m.meeting_date,
          location: m.location,
          startTime: m.start_time || '',
          endTime: m.end_time || '',
          attendees: m.attendee_count || 0,
          staffAttendance: m.staff_attendance || [],
        }))
        setMeetings(mapped)
      }

      // 미납자 조회 (현재 월)
      const currentMonth = getCurrentMonth()
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('member_id')
        .eq('payment_month', currentMonth)
        .eq('status', 'paid')

      const paidMemberIds = new Set(paymentsData?.map(p => p.member_id) || [])
      const unpaid = (membersData || [])
        .filter(m => !paidMemberIds.has(m.id))
        .map(m => ({ member: m, amount: 3000 }))

      setUnpaidMembers(unpaid)
      setLoading(false)
    }

    fetchData()
  }, [])

  // 이번 주 모임 수
  const thisWeekMeetingsCount = MEETING_DAYS.filter(day => {
    const targetDate = getThisWeekDate(day.dayOfWeek)
    return meetings.some(m => m.date === targetDate)
  }).length

  // 이번 주 운영진 참석률 계산
  const calculateStaffAttendanceRate = () => {
    if (staffMembers.length === 0) return 0

    let totalAttending = 0
    let totalSlots = 0

    MEETING_DAYS.forEach(day => {
      const targetDate = getThisWeekDate(day.dayOfWeek)
      const meeting = meetings.find(m => m.date === targetDate)

      if (meeting) {
        totalSlots += staffMembers.length
        meeting.staffAttendance.forEach(sa => {
          if (sa.status === 'attending') totalAttending++
        })
      }
    })

    if (totalSlots === 0) return 0
    return Math.round((totalAttending / totalSlots) * 100)
  }

  // 요일별 모임 찾기
  const getMeetingForDay = (dayOfWeek: number) => {
    const targetDate = getThisWeekDate(dayOfWeek)
    return meetings.find(m => m.date === targetDate)
  }

  // 오늘
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // 통계
  const stats = [
    {
      label: '활동 회원',
      value: `${members.length}명`,
      icon: Users,
      color: 'bg-blue-500',
      href: '/members'
    },
    {
      label: '이번 달 미납',
      value: `${unpaidMembers.length}명`,
      icon: CreditCard,
      color: 'bg-red-500',
      href: '/payments'
    },
    {
      label: '이번 주 모임',
      value: `${thisWeekMeetingsCount}회`,
      icon: Calendar,
      color: 'bg-purple-500',
      href: '/meetings'
    },
    {
      label: '운영진 참석률',
      value: `${calculateStaffAttendanceRate()}%`,
      icon: UserCheck,
      color: 'bg-emerald-500',
      href: '/meetings'
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <h1 className="text-xl md:text-2xl font-bold text-gray-800">대시보드</h1>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.label}
              className="card cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => router.push(stat.href)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-full ${stat.color}`}>
                  <Icon className="text-white" size={24} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 이번 주 모임 & 미납 현황 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* 이번 주 모임 */}
        <div
          className="card cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => router.push('/meetings')}
        >
          <h3 className="card-header flex items-center gap-2">
            <Calendar size={18} className="text-purple-500" />
            이번 주 모임
          </h3>
          <div className="space-y-2">
            {MEETING_DAYS.map((day) => {
              const meeting = getMeetingForDay(day.dayOfWeek)
              const targetDate = getThisWeekDate(day.dayOfWeek)
              const isPast = new Date(targetDate) < today

              // 참석 또는 미정인 운영진만 필터링
              const activeStaff = meeting
                ? meeting.staffAttendance
                    .filter((sa: { memberId: string; status: StaffStatus }) => sa.status === 'attending' || sa.status === 'pending')
                    .map((sa: { memberId: string; status: StaffStatus }) => {
                      const staff = staffMembers.find((s: Member) => s.id === sa.memberId)
                      return staff ? { id: staff.id, name: staff.name, attendStatus: sa.status } : null
                    })
                    .filter((item): item is { id: string; name: string; attendStatus: 'attending' | 'pending' } => item !== null)
                : []

              return (
                <div
                  key={day.key}
                  className={`flex items-center justify-between p-2 rounded-lg ${
                    meeting
                      ? 'bg-emerald-50 border border-emerald-200'
                      : 'bg-gray-50 border border-gray-100'
                  } ${isPast ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold ${
                      meeting ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
                    }`}>
                      {day.label}
                    </span>
                    <div>
                      {meeting ? (
                        <>
                          <div className="flex items-center gap-1 text-sm font-medium text-gray-800">
                            <MapPin size={12} className="text-emerald-500" />
                            {meeting.location}
                          </div>
                          {meeting.startTime && (
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock size={10} />
                              {formatTime(meeting.startTime)}
                              {meeting.endTime && ` - ${formatTime(meeting.endTime)}`}
                            </div>
                          )}
                          {/* 운영진 칩 */}
                          {activeStaff.length > 0 && (
                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                              {activeStaff.map((staff) => (
                                <span
                                  key={staff.id}
                                  className={`px-1.5 py-0.5 text-xs font-medium rounded ${
                                    staff.attendStatus === 'attending'
                                      ? 'bg-emerald-500 text-white'
                                      : 'bg-amber-400 text-white'
                                  }`}
                                >
                                  {staff.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-gray-400">모임 없음</p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">{formatDate(targetDate)}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* 회비 미납자 */}
        <div
          className="card cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => router.push('/payments')}
        >
          <h3 className="card-header flex items-center gap-2">
            <AlertCircle size={18} className="text-red-500" />
            회비 미납 현황
            {unpaidMembers.length > 0 && (
              <span className="ml-auto text-sm font-normal text-red-500">
                {unpaidMembers.length}명
              </span>
            )}
          </h3>
          {unpaidMembers.length === 0 ? (
            <div className="py-8 text-center text-gray-400">
              미납자가 없습니다
            </div>
          ) : (
            <div className="space-y-2 max-h-[280px] overflow-auto">
              {unpaidMembers.map(({ member, amount }) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-2 bg-red-50 rounded-lg border border-red-100"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-100 text-red-600 text-sm font-bold">
                      {member.name.charAt(0)}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{member.name}</p>
                      {member.nickname && (
                        <p className="text-xs text-gray-500">{member.nickname}</p>
                      )}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-medium rounded">
                    {amount.toLocaleString()}원
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
