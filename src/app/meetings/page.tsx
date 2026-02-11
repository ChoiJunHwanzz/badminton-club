'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { Plus, MapPin, Clock, Users, X, UserCheck, HelpCircle, User, XCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { Member, MemberRole } from '@/types/database'

// 요일 정보 (화목금토일)
const MEETING_DAYS = [
  { key: 'tue', label: '화', dayOfWeek: 2 },
  { key: 'thu', label: '목', dayOfWeek: 4 },
  { key: 'fri', label: '금', dayOfWeek: 5 },
  { key: 'sat', label: '토', dayOfWeek: 6 },
  { key: 'sun', label: '일', dayOfWeek: 0 },
]

// 역할 라벨
const roleLabels: Record<MemberRole, string> = {
  leader: '모임장',
  advisor: '고문',
  staff: '운영진',
  member: '회원',
}

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

  // 일요일(0)을 7로 변환하여 토요일 다음에 오도록 처리
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

// 시간 포맷 (HH:MM:SS → HH:MM)
const formatTime = (timeStr: string) => {
  if (!timeStr) return ''
  return timeStr.substring(0, 5)
}

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [staffMembers, setStaffMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDay, setSelectedDay] = useState<typeof MEETING_DAYS[0] | null>(null)

  // 모달 폼 상태
  const [formData, setFormData] = useState({
    date: '',
    location: '',
    startTime: '',
    endTime: '',
    attendees: 0,
  })
  const [staffAttendance, setStaffAttendance] = useState<{ [key: string]: StaffStatus }>({})
  const [submitting, setSubmitting] = useState(false)

  const supabase = createClient()

  // 데이터 조회
  const fetchData = async () => {
    setLoading(true)

    // 운영진 + 모임장 조회
    const { data: staffData } = await supabase
      .from('members')
      .select('*')
      .in('role', ['leader', 'staff'])
      .eq('status', 'active')
      .order('role', { ascending: true })
      .order('name', { ascending: true })

    if (staffData) {
      setStaffMembers(staffData)
    }

    // 모임 조회 (이번 주 + 과거)
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

    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  // 요일별 이번 주 모임 찾기
  const getMeetingForDay = (dayOfWeek: number) => {
    const targetDate = getThisWeekDate(dayOfWeek)
    return meetings.find(m => m.date === targetDate)
  }

  // 오늘 날짜
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // 모달 열기
  const openModal = (day: typeof MEETING_DAYS[0]) => {
    setSelectedDay(day)
    const targetDate = getThisWeekDate(day.dayOfWeek)
    const existingMeeting = getMeetingForDay(day.dayOfWeek)

    if (existingMeeting) {
      setFormData({
        date: existingMeeting.date,
        location: existingMeeting.location,
        startTime: formatTime(existingMeeting.startTime),
        endTime: formatTime(existingMeeting.endTime),
        attendees: existingMeeting.attendees,
      })
      const attendance: { [key: string]: StaffStatus } = {}
      existingMeeting.staffAttendance.forEach(sa => {
        attendance[sa.memberId] = sa.status
      })
      setStaffAttendance(attendance)
    } else {
      setFormData({
        date: targetDate,
        location: '사당종합체육관',
        startTime: '',
        endTime: '',
        attendees: 0,
      })
      // 기본값: 모두 불참
      const attendance: { [key: string]: StaffStatus } = {}
      staffMembers.forEach(s => {
        attendance[s.id] = 'absent'
      })
      setStaffAttendance(attendance)
    }

    setIsModalOpen(true)
  }

  // 모달 닫기
  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedDay(null)
    setFormData({ date: '', location: '', startTime: '', endTime: '', attendees: 0 })
    setStaffAttendance({})
  }

  // 운영진 참석 토글 (참석 → 미정 → 불참 → 참석)
  const toggleStaffAttendance = (memberId: string) => {
    setStaffAttendance(prev => {
      const current = prev[memberId] || 'pending'
      const next: StaffStatus =
        current === 'attending' ? 'pending' :
        current === 'pending' ? 'absent' : 'attending'
      return { ...prev, [memberId]: next }
    })
  }

  // 저장
  const handleSubmit = async () => {
    if (!formData.date || !formData.location) {
      alert('날짜와 장소는 필수입니다.')
      return
    }

    setSubmitting(true)

    const staffAttendanceArray = Object.entries(staffAttendance).map(([memberId, status]) => ({
      memberId,
      status,
    }))

    const existingMeeting = meetings.find(m => m.date === formData.date)

    try {
      if (existingMeeting) {
        // 업데이트
        const { error } = await supabase
          .from('meetings')
          .update({
            location: formData.location,
            start_time: formData.startTime || null,
            end_time: formData.endTime || null,
            attendee_count: formData.attendees,
            staff_attendance: staffAttendanceArray,
          })
          .eq('id', existingMeeting.id)

        if (error) throw error
      } else {
        // 신규 등록
        const { error } = await supabase
          .from('meetings')
          .insert({
            meeting_date: formData.date,
            location: formData.location,
            start_time: formData.startTime || null,
            end_time: formData.endTime || null,
            attendee_count: formData.attendees,
            staff_attendance: staffAttendanceArray,
          })

        if (error) throw error
      }

      alert('저장되었습니다.')
      closeModal()
      fetchData()
    } catch (error: any) {
      alert('저장 실패: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <h1 className="text-xl md:text-2xl font-bold text-gray-800">모임관리</h1>

      {/* 이번 주 모임 - 5개 요일 카드 */}
      <div>
        <h2 className="text-base md:text-lg font-semibold text-gray-700 mb-3 md:mb-4">이번 주 모임</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
          {MEETING_DAYS.map((day) => {
            const meeting = getMeetingForDay(day.dayOfWeek)
            const targetDate = getThisWeekDate(day.dayOfWeek)
            const isPast = new Date(targetDate) < today
            return (
              <div
                key={day.key}
                className={`relative overflow-hidden rounded-xl shadow-sm hover:shadow-md transition-all ${
                  meeting
                    ? 'bg-gradient-to-br from-emerald-50 to-white border border-emerald-200'
                    : 'bg-gray-50 border border-gray-200'
                } ${isPast ? 'opacity-50' : ''}`}
              >
                {/* 상단 요일/날짜 헤더 */}
                <div className={`px-3 py-2 flex items-center justify-between ${meeting ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                  <span className="text-sm font-bold text-white">{day.label}요일</span>
                  <span className="text-xs text-white/80">{formatDate(targetDate)}</span>
                </div>

                {/* 내용 */}
                <div className="p-4">
                  {meeting ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-gray-700">
                        <MapPin size={14} className="text-emerald-500 flex-shrink-0" />
                        <span className="text-sm truncate">{meeting.location}</span>
                      </div>
                      {meeting.startTime && (
                        <div className="flex items-center gap-2 text-gray-700">
                          <Clock size={14} className="text-emerald-500 flex-shrink-0" />
                          <span className="text-sm">{formatTime(meeting.startTime)}{meeting.endTime ? ` - ${formatTime(meeting.endTime)}` : ''}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-gray-700">
                        <Users size={14} className="text-emerald-500 flex-shrink-0" />
                        <span className="text-sm font-medium">{meeting.attendees}명 참석</span>
                      </div>

                      {/* 운영진 참석 현황 */}
                      <div className="mt-3 pt-3 border-t border-emerald-200">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-2">
                          <User size={14} />
                          <span>운영진 참석</span>
                        </div>
                        <div className="space-y-1.5">
                          {staffMembers.map((staff) => {
                            const status = meeting.staffAttendance.find(s => s.memberId === staff.id)?.status || 'absent'
                            return (
                              <div key={staff.id} className="flex items-center justify-between py-0.5">
                                <span className="text-sm font-medium text-gray-800">{staff.name}</span>
                                <span className={`px-2 py-0.5 text-xs font-medium rounded-md ${
                                  status === 'attending'
                                    ? 'bg-emerald-500 text-white'
                                    : status === 'pending'
                                    ? 'bg-amber-400 text-white'
                                    : 'bg-gray-200 text-gray-500'
                                }`}>
                                  {status === 'attending' ? '참석' : status === 'pending' ? '미정' : '불참'}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      <button
                        onClick={() => openModal(day)}
                        className="w-full mt-2 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        수정
                      </button>
                    </div>
                  ) : (
                    <div className="py-4 text-center">
                      <p className="text-sm text-gray-400 mb-3">등록된 모임이 없습니다</p>
                      <button
                        onClick={() => openModal(day)}
                        className="inline-flex items-center gap-1 px-4 py-2 bg-gray-200 hover:bg-emerald-500 hover:text-white text-gray-600 text-sm font-medium rounded-lg transition-colors"
                        disabled={isPast}
                      >
                        <Plus size={16} />
                        <span>추가</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 모달 */}
      {isModalOpen && selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={closeModal} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-auto">
            {/* 헤더 */}
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
              <h2 className="text-lg font-semibold text-gray-800">
                {selectedDay.label}요일 모임 {getMeetingForDay(selectedDay.dayOfWeek) ? '수정' : '등록'}
              </h2>
              <button onClick={closeModal} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                <X size={20} />
              </button>
            </div>

            {/* 폼 */}
            <div className="px-6 py-4 space-y-4">
              {/* 날짜 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">날짜</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>

              {/* 장소 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">장소</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="예: 올림픽공원 체육관"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>

              {/* 시간 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">시작 시간</label>
                  <input
                    type="time"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">종료 시간</label>
                  <input
                    type="time"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  />
                </div>
              </div>

              {/* 참석인원 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">참석인원</label>
                <input
                  type="number"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  value={formData.attendees || ''}
                  onChange={(e) => setFormData({ ...formData, attendees: parseInt(e.target.value) || 0 })}
                />
              </div>

              {/* 운영진 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">운영진 참석</label>
                <div className="space-y-2 max-h-[200px] overflow-auto border border-gray-200 rounded-lg p-3">
                  {staffMembers.map((staff) => (
                    <div
                      key={staff.id}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{staff.name}</span>
                        <span className="text-xs text-gray-500">({roleLabels[staff.role]})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleStaffAttendance(staff.id)}
                        className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          staffAttendance[staff.id] === 'attending'
                            ? 'bg-emerald-100 text-emerald-700'
                            : staffAttendance[staff.id] === 'pending'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-200 text-gray-500'
                        }`}
                      >
                        {staffAttendance[staff.id] === 'attending' ? (
                          <>
                            <UserCheck size={14} />
                            참석
                          </>
                        ) : staffAttendance[staff.id] === 'pending' ? (
                          <>
                            <HelpCircle size={14} />
                            미정
                          </>
                        ) : (
                          <>
                            <XCircle size={14} />
                            불참
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                  {staffMembers.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      운영진이 없습니다.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 푸터 */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button onClick={closeModal} className="btn btn-secondary" disabled={submitting}>
                취소
              </button>
              <button onClick={handleSubmit} className="btn btn-primary" disabled={submitting}>
                {submitting ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
