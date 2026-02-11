'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { Search, Save, Check, X, UserX, LogOut, UserCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { Member, MemberRole, MemberRegistration, MemberStatus } from '@/types/database'

// 역할 라벨
const roleLabels: Record<MemberRole, string> = {
  leader: '모임장',
  advisor: '고문',
  staff: '운영진',
  member: '회원',
}

const roleColors: Record<MemberRole, string> = {
  leader: 'bg-purple-100 text-purple-800',
  advisor: 'bg-blue-100 text-blue-800',
  staff: 'bg-emerald-100 text-emerald-800',
  member: 'bg-gray-100 text-gray-800',
}

// 상태 라벨
const statusLabels: Record<MemberStatus, string> = {
  active: '활동',
  left: '탈퇴',
  kicked: '강퇴',
}

const statusColors: Record<MemberStatus, string> = {
  active: 'bg-emerald-100 text-emerald-800',
  left: 'bg-gray-100 text-gray-600',
  kicked: 'bg-red-100 text-red-800',
}

// 역할 우선순위
const roleOrder: Record<MemberRole, number> = {
  leader: 1,
  advisor: 2,
  staff: 3,
  member: 4,
}

type MemberWithRegistration = Member & {
  registration: MemberRegistration | null
}

// 날짜 헬퍼
const formatDate = (date: Date) => date.toISOString().split('T')[0]
const get50DaysAgo = () => {
  const date = new Date()
  date.setDate(date.getDate() - 50)
  return formatDate(date)
}

export default function RegistrationsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [members, setMembers] = useState<MemberWithRegistration[]>([])
  const [loading, setLoading] = useState(true)

  // 조회기간
  const [dateFrom, setDateFrom] = useState(get50DaysAgo())
  const [dateTo, setDateTo] = useState(formatDate(new Date()))

  // 비고 편집 상태
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editNote, setEditNote] = useState('')

  const supabase = createClient()

  // 회원 + 가입절차 정보 조회
  const fetchData = async () => {
    setLoading(true)

    // 회원 조회 (가입일 기준 필터)
    const { data: membersData, error: membersError } = await supabase
      .from('members')
      .select('*')
      .gte('join_date', dateFrom)
      .lte('join_date', dateTo)
      .order('join_date', { ascending: false })

    if (membersError) {
      console.error('Error fetching members:', membersError)
      setLoading(false)
      return
    }

    // 가입절차 정보 조회
    const { data: registrationsData, error: registrationsError } = await supabase
      .from('member_registrations')
      .select('*')

    if (registrationsError) {
      console.error('Error fetching registrations:', registrationsError)
    }

    // 회원과 가입절차 정보 병합
    const merged: MemberWithRegistration[] = (membersData || []).map(member => ({
      ...member,
      registration: registrationsData?.find(r => r.member_id === member.id) || null
    }))

    setMembers(merged)
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [dateFrom, dateTo])

  // 정렬된 회원 목록
  const sortedMembers = [...members]
    .filter(member =>
      member.name.includes(searchTerm) ||
      (member.nickname && member.nickname.includes(searchTerm))
    )
    .sort((a, b) => {
      // 역할 우선순위로 정렬
      const roleCompare = roleOrder[a.role] - roleOrder[b.role]
      if (roleCompare !== 0) return roleCompare
      // 가입일로 2차 정렬
      return (a.join_date || '').localeCompare(b.join_date || '')
    })

  // 체크박스 즉시 토글
  const toggleCheckbox = async (
    member: MemberWithRegistration,
    field: 'introduction' | 'fee_paid' | 'is_rejoin'
  ) => {
    const newValue = !member.registration?.[field]

    if (member.registration) {
      // 기존 데이터 업데이트
      const { error } = await supabase
        .from('member_registrations')
        .update({ [field]: newValue })
        .eq('member_id', member.id)

      if (error) {
        alert('수정 실패: ' + error.message)
        return
      }
    } else {
      // 신규 데이터 삽입
      const { error } = await supabase
        .from('member_registrations')
        .insert({
          member_id: member.id,
          [field]: newValue,
        })

      if (error) {
        alert('등록 실패: ' + error.message)
        return
      }
    }

    // 로컬 상태 즉시 업데이트
    setMembers(prev => prev.map(m => {
      if (m.id === member.id) {
        return {
          ...m,
          registration: m.registration
            ? { ...m.registration, [field]: newValue }
            : {
                id: '',
                member_id: member.id,
                introduction: field === 'introduction' ? newValue : false,
                fee_paid: field === 'fee_paid' ? newValue : false,
                is_rejoin: field === 'is_rejoin' ? newValue : false,
                note: null,
                created_at: '',
                updated_at: ''
              }
        }
      }
      return m
    }))
  }

  // 비고 편집 시작
  const startNoteEdit = (member: MemberWithRegistration) => {
    setEditingNoteId(member.id)
    setEditNote(member.registration?.note || '')
  }

  // 비고 저장
  const saveNote = async (memberId: string) => {
    const member = members.find(m => m.id === memberId)
    if (!member) return

    if (member.registration) {
      const { error } = await supabase
        .from('member_registrations')
        .update({ note: editNote || null })
        .eq('member_id', memberId)

      if (error) {
        alert('수정 실패: ' + error.message)
        return
      }
    } else {
      const { error } = await supabase
        .from('member_registrations')
        .insert({
          member_id: memberId,
          note: editNote || null,
        })

      if (error) {
        alert('등록 실패: ' + error.message)
        return
      }
    }

    setEditingNoteId(null)
    setEditNote('')
    fetchData()
  }

  // 비고 편집 취소
  const cancelNoteEdit = () => {
    setEditingNoteId(null)
    setEditNote('')
  }

  // 회원 상태 변경 (활동/탈퇴/강퇴)
  const handleStatusChange = async (memberId: string, newStatus: MemberStatus) => {
    const statusLabel = newStatus === 'active' ? '활동' : newStatus === 'left' ? '탈퇴' : '강퇴'
    if (!confirm(`정말 ${statusLabel} 처리하시겠습니까?`)) return

    const { error } = await supabase
      .from('members')
      .update({ status: newStatus })
      .eq('id', memberId)

    if (error) {
      alert(`${statusLabel} 처리 실패: ` + error.message)
      return
    }

    fetchData()
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <h1 className="text-xl md:text-2xl font-bold text-gray-800">신규회원관리</h1>

      {/* 조회기간 + 검색 */}
      <div className="flex flex-col md:flex-row gap-2 md:gap-4">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
          <span className="text-xs md:text-sm font-medium text-gray-700 whitespace-nowrap">가입일</span>
          <input
            type="date"
            className="border-0 bg-transparent text-xs md:text-sm text-gray-600 focus:outline-none focus:ring-0 cursor-pointer w-[110px] md:w-auto"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <span className="text-gray-400">~</span>
          <input
            type="date"
            className="border-0 bg-transparent text-xs md:text-sm text-gray-600 focus:outline-none focus:ring-0 cursor-pointer w-[110px] md:w-auto"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
        <div className="relative flex-1 md:w-64 md:flex-none">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="이름/닉네임 검색"
            className="w-full py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            style={{ paddingLeft: '36px', paddingRight: '12px' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* 회원 목록 */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">로딩 중...</div>
        ) : (
          <div className="table-container overflow-auto max-h-[calc(100vh-280px)] md:max-h-[calc(100vh-300px)]">
            <table className="table">
              <thead className="sticky top-0 z-10 bg-gray-50">
                <tr>
                  <th className="whitespace-nowrap text-left">이름</th>
                  <th className="whitespace-nowrap text-left">닉네임</th>
                  <th className="whitespace-nowrap text-center">역할</th>
                  <th className="whitespace-nowrap text-center">가입일</th>
                  <th className="whitespace-nowrap text-center">자기소개</th>
                  <th className="whitespace-nowrap text-center">회비</th>
                  <th className="whitespace-nowrap text-center">재가입</th>
                  <th className="whitespace-nowrap text-center">상태</th>
                  <th className="whitespace-nowrap text-center">상태변경</th>
                  <th className="whitespace-nowrap text-left w-48">비고</th>
                </tr>
              </thead>
              <tbody>
                {sortedMembers.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-8 text-gray-500">
                      {members.length === 0 ? '조회된 회원이 없습니다.' : '검색 결과가 없습니다.'}
                    </td>
                  </tr>
                ) : (
                  sortedMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="font-medium">{member.name}</td>
                      <td>{member.nickname || '-'}</td>
                      <td className="text-center">
                        <span className={`badge ${roleColors[member.role]}`}>{roleLabels[member.role]}</span>
                      </td>
                      <td className="text-center">{member.join_date}</td>
                      <td className="text-center">
                        <input
                          type="checkbox"
                          className="w-5 h-5 accent-emerald-600 cursor-pointer"
                          checked={member.registration?.introduction || false}
                          onChange={() => toggleCheckbox(member, 'introduction')}
                        />
                      </td>
                      <td className="text-center">
                        <input
                          type="checkbox"
                          className="w-5 h-5 accent-emerald-600 cursor-pointer"
                          checked={member.registration?.fee_paid || false}
                          onChange={() => toggleCheckbox(member, 'fee_paid')}
                        />
                      </td>
                      <td className="text-center">
                        <input
                          type="checkbox"
                          className="w-5 h-5 accent-blue-600 cursor-pointer"
                          checked={member.registration?.is_rejoin || false}
                          onChange={() => toggleCheckbox(member, 'is_rejoin')}
                        />
                      </td>
                      <td className="text-center">
                        <span className={`badge ${statusColors[member.status]}`}>{statusLabels[member.status]}</span>
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleStatusChange(member.id, 'active')}
                            className={`p-1 ${member.status === 'active' ? 'text-emerald-600' : 'text-gray-400 hover:text-emerald-600'}`}
                            title="활동"
                          >
                            <UserCheck size={18} />
                          </button>
                          <button
                            onClick={() => handleStatusChange(member.id, 'left')}
                            className={`p-1 ${member.status === 'left' ? 'text-orange-600' : 'text-gray-400 hover:text-orange-600'}`}
                            title="탈퇴"
                          >
                            <LogOut size={18} />
                          </button>
                          <button
                            onClick={() => handleStatusChange(member.id, 'kicked')}
                            className={`p-1 ${member.status === 'kicked' ? 'text-red-600' : 'text-gray-400 hover:text-red-600'}`}
                            title="강퇴"
                          >
                            <UserX size={18} />
                          </button>
                        </div>
                      </td>
                      <td>
                        {editingNoteId === member.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              className="input py-1 text-sm flex-1"
                              placeholder="비고"
                              value={editNote}
                              onChange={(e) => setEditNote(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && saveNote(member.id)}
                              autoFocus
                            />
                            <button onClick={() => saveNote(member.id)} className="p-1 text-emerald-600 hover:text-emerald-700" title="저장">
                              <Save size={16} />
                            </button>
                            <button onClick={cancelNoteEdit} className="p-1 text-gray-500 hover:text-gray-700" title="취소">
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <span
                            className="cursor-pointer hover:text-emerald-600"
                            onClick={() => startNoteEdit(member)}
                          >
                            {member.registration?.note || '-'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 도움말 */}
      <div className="text-xs md:text-sm text-gray-500 hidden md:block">
        💡 체크박스 클릭 → 즉시 저장 | 비고 클릭 → 편집 | 탈퇴/강퇴 버튼으로 상태변경
      </div>
    </div>
  )
}
