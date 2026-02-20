'use client'

export const dynamic = 'force-dynamic'

import React, { useState, useEffect } from 'react'
import { Users, XCircle, Clock, AlertTriangle, Plus, Trash2, Search, X, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { Member, Penalty, PenaltyType } from '@/types/database'

type FilterType = 'all' | 'cancel' | 'late' | 'after_4pm' | 'unpaid_fine'

const penaltyTypeLabels: Record<PenaltyType, string> = {
  cancel: '당일취소',
  late: '지각',
}

const penaltyTypeColors: Record<PenaltyType, string> = {
  cancel: 'bg-red-100 text-red-800',
  late: 'bg-yellow-100 text-yellow-800',
}

type MemberSummary = {
  member: Member
  cancelCount: number
  lateCount: number
  after4pmCount: number
  totalCount: number
}

export default function PenaltiesPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [penalties, setPenalties] = useState<Penalty[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showActive, setShowActive] = useState(true)
  const [showLeft, setShowLeft] = useState(true)
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)

  // 신규 추가 폼 (인라인)
  const [isAdding, setIsAdding] = useState(false)
  const [newType, setNewType] = useState<PenaltyType>('cancel')
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0])
  const [newAfter4pm, setNewAfter4pm] = useState(false)

  // 모달
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMemberId, setModalMemberId] = useState('')
  const [modalMemberSearch, setModalMemberSearch] = useState('')
  const [isModalDropdownOpen, setIsModalDropdownOpen] = useState(false)
  const [modalType, setModalType] = useState<PenaltyType>('cancel')
  const [modalDate, setModalDate] = useState(new Date().toISOString().split('T')[0])
  const [modalAfter4pm, setModalAfter4pm] = useState(false)

  const supabase = createClient()

  const fetchData = async () => {
    setLoading(true)

    const [membersRes, penaltiesRes] = await Promise.all([
      supabase.from('members').select('*').order('name'),
      supabase.from('penalties').select('*').order('date', { ascending: false }),
    ])

    if (membersRes.error) console.error('Members error:', membersRes.error)
    if (penaltiesRes.error) console.error('Penalties error:', penaltiesRes.error)

    setMembers(membersRes.data || [])
    setPenalties(penaltiesRes.data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  // 통계 (인원 기준)
  const countUniqueMembers = (predicate: (p: Penalty) => boolean) =>
    new Set(penalties.filter(predicate).map(p => p.member_id)).size
  const cancelMemberCount = countUniqueMembers(p => p.type === 'cancel')
  const lateMemberCount = countUniqueMembers(p => p.type === 'late')
  const after4pmMemberCount = countUniqueMembers(p => p.after_4pm)
  const unpaidFineMemberCount = countUniqueMembers(p => p.after_4pm && !p.fine_paid)

  // 필터에 해당하는 회원 ID 집합
  const filteredMemberIds: Set<string> | null = (() => {
    if (filter === 'all') return null // null이면 전체 표시
    const predicate = (p: Penalty) => {
      if (filter === 'cancel') return p.type === 'cancel'
      if (filter === 'late') return p.type === 'late'
      if (filter === 'after_4pm') return p.after_4pm
      if (filter === 'unpaid_fine') return p.after_4pm && !p.fine_paid
      return true
    }
    return new Set(penalties.filter(predicate).map(p => p.member_id))
  })()

  // 회원별 요약 (전체 penalties 기준으로 카운트, 필터는 회원 표시 여부에만 적용)
  const memberSummaries: MemberSummary[] = members
    .map(member => {
      const memberPenalties = penalties.filter(p => p.member_id === member.id)
      return {
        member,
        cancelCount: memberPenalties.filter(p => p.type === 'cancel').length,
        lateCount: memberPenalties.filter(p => p.type === 'late').length,
        after4pmCount: memberPenalties.filter(p => p.after_4pm).length,
        totalCount: memberPenalties.length,
      }
    })
    .filter(s => {
      // 카드 필터 (해당 페널티가 있는 회원만)
      if (filteredMemberIds && !filteredMemberIds.has(s.member.id)) return false
      // 활동상태 필터
      const matchesStatus = (showActive && s.member.status === 'active') || (showLeft && (s.member.status === 'left' || s.member.status === 'kicked'))
      if (!matchesStatus) return false
      // 검색 필터
      if (!searchTerm) return true
      return s.member.name.includes(searchTerm) || (s.member.nickname && s.member.nickname.includes(searchTerm))
    })
    .sort((a, b) => b.totalCount - a.totalCount || a.member.name.localeCompare(b.member.name))

  // 선택 회원의 상세 penalties
  const selectedPenalties = selectedMemberId
    ? penalties.filter(p => p.member_id === selectedMemberId)
    : []

  const selectedMember = members.find(m => m.id === selectedMemberId)

  // 추가
  const handleAdd = async () => {
    if (!selectedMemberId) return

    const { error } = await supabase.from('penalties').insert({
      member_id: selectedMemberId,
      type: newType,
      date: newDate,
      after_4pm: newType === 'cancel' ? newAfter4pm : false,
      fine_paid: false,
    })

    if (error) {
      alert('추가 실패: ' + error.message)
      return
    }

    setIsAdding(false)
    setNewType('cancel')
    setNewDate(new Date().toISOString().split('T')[0])
    setNewAfter4pm(false)
    fetchData()
  }

  // 모달 추가
  const handleModalAdd = async () => {
    if (!modalMemberId) {
      alert('회원을 선택해주세요.')
      return
    }

    const { error } = await supabase.from('penalties').insert({
      member_id: modalMemberId,
      type: modalType,
      date: modalDate,
      after_4pm: modalType === 'cancel' ? modalAfter4pm : false,
      fine_paid: false,
    })

    if (error) {
      alert('추가 실패: ' + error.message)
      return
    }

    setIsModalOpen(false)
    setModalMemberId('')
    setModalMemberSearch('')
    setIsModalDropdownOpen(false)
    setModalType('cancel')
    setModalDate(new Date().toISOString().split('T')[0])
    setModalAfter4pm(false)
    fetchData()
  }

  // 삭제
  const handleDelete = async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return

    const { error } = await supabase.from('penalties').delete().eq('id', id)
    if (error) {
      alert('삭제 실패: ' + error.message)
      return
    }
    fetchData()
  }

  // 체크박스 토글
  const handleToggle = async (id: string, field: 'after_4pm' | 'fine_paid', value: boolean) => {
    const updateData: Record<string, boolean> = { [field]: value }
    // after_4pm 해제 시 fine_paid도 해제
    if (field === 'after_4pm' && !value) {
      updateData.fine_paid = false
    }

    const { error } = await supabase.from('penalties').update(updateData).eq('id', id)
    if (error) {
      alert('수정 실패: ' + error.message)
      return
    }
    fetchData()
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <h1 className="text-xl md:text-2xl font-bold text-gray-800">당일취소/지각 관리</h1>

      {/* 필터 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        <div
          className={`card text-center cursor-pointer transition-all hover:shadow-md ${filter === 'cancel' ? 'ring-2 ring-red-400' : ''}`}
          onClick={() => setFilter(filter === 'cancel' ? 'all' : 'cancel')}
        >
          <div className="flex items-center justify-center gap-2 mb-1">
            <XCircle size={18} className="text-red-500" />
            <span className="text-sm text-gray-500">당일취소</span>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-red-600">{cancelMemberCount}명</p>
        </div>
        <div
          className={`card text-center cursor-pointer transition-all hover:shadow-md ${filter === 'late' ? 'ring-2 ring-yellow-400' : ''}`}
          onClick={() => setFilter(filter === 'late' ? 'all' : 'late')}
        >
          <div className="flex items-center justify-center gap-2 mb-1">
            <Clock size={18} className="text-yellow-500" />
            <span className="text-sm text-gray-500">지각</span>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-yellow-600">{lateMemberCount}명</p>
        </div>
        <div
          className={`card text-center cursor-pointer transition-all hover:shadow-md ${filter === 'after_4pm' ? 'ring-2 ring-orange-400' : ''}`}
          onClick={() => setFilter(filter === 'after_4pm' ? 'all' : 'after_4pm')}
        >
          <div className="flex items-center justify-center gap-2 mb-1">
            <AlertTriangle size={18} className="text-orange-500" />
            <span className="text-sm text-gray-500">4시이후취소</span>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-orange-600">{after4pmMemberCount}명</p>
        </div>
        <div
          className={`card text-center cursor-pointer transition-all hover:shadow-md ${filter === 'unpaid_fine' ? 'ring-2 ring-rose-400' : ''}`}
          onClick={() => setFilter(filter === 'unpaid_fine' ? 'all' : 'unpaid_fine')}
        >
          <div className="flex items-center justify-center gap-2 mb-1">
            <Users size={18} className="text-rose-500" />
            <span className="text-sm text-gray-500">벌금 미납</span>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-rose-600">{unpaidFineMemberCount}명</p>
        </div>
      </div>

      {/* 검색 + 추가 */}
      <div className="flex items-center gap-2">
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
        <div className="flex items-center">
          <button
            onClick={() => setShowActive(!showActive)}
            className={`whitespace-nowrap text-xs px-3 py-2 rounded-l-lg border transition-colors ${
              showActive
                ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                : 'bg-white text-gray-400 border-gray-300 hover:bg-gray-50'
            }`}
          >
            활동
          </button>
          <button
            onClick={() => setShowLeft(!showLeft)}
            className={`whitespace-nowrap text-xs px-3 py-2 rounded-r-lg border border-l-0 transition-colors ${
              showLeft
                ? 'bg-red-100 text-red-700 border-red-300'
                : 'bg-white text-gray-400 border-gray-300 hover:bg-gray-50'
            }`}
          >
            탈퇴
          </button>
        </div>
        <div className="hidden md:block flex-1" />
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm"
        >
          <Plus size={16} />
          <span className="hidden md:inline">추가하기</span>
          <span className="md:hidden">추가</span>
        </button>
      </div>

      {/* 메인 컨텐츠 */}
      {loading ? (
        <div className="card p-8 text-center text-gray-500">로딩 중...</div>
      ) : (
        <>
          {/* 모바일: 아코디언 리스트 */}
          <div className="md:hidden">
            <div className="card p-0 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h2 className="text-sm font-semibold text-gray-700">회원별 현황</h2>
              </div>
              <div className="overflow-auto h-[480px]">
                {memberSummaries.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-sm">해당 데이터가 없습니다.</div>
                ) : (
                  <table className="table w-full">
                    <thead className="sticky top-0 z-10 bg-gray-50">
                      <tr>
                        <th className="text-left">이름</th>
                        <th className="text-center">당일취소</th>
                        <th className="text-center">지각</th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                    {memberSummaries.map(({ member, cancelCount, lateCount }) => {
                      const isSelected = selectedMemberId === member.id
                      const memberPenalties = penalties.filter(p => p.member_id === member.id)
                      return (
                        <React.Fragment key={member.id}>
                          <tr
                            className={`cursor-pointer transition-colors ${
                              isSelected ? 'bg-emerald-50' : 'hover:bg-gray-50'
                            }`}
                            onClick={() => {
                              setSelectedMemberId(isSelected ? null : member.id)
                              setIsAdding(false)
                            }}
                          >
                            <td className="font-medium">{member.name}</td>
                            <td className="text-center">
                              {cancelCount > 0 ? (
                                <span className="text-red-600 font-semibold">{cancelCount}</span>
                              ) : (
                                <span className="text-gray-300">0</span>
                              )}
                            </td>
                            <td className="text-center">
                              {lateCount > 0 ? (
                                <span className="text-yellow-600 font-semibold">{lateCount}</span>
                              ) : (
                                <span className="text-gray-300">0</span>
                              )}
                            </td>
                            <td className="text-center px-1">
                              <ChevronDown
                                size={14}
                                className={`text-gray-400 transition-transform ${isSelected ? 'rotate-180' : ''}`}
                              />
                            </td>
                          </tr>
                          {/* 드롭다운 상세 */}
                          {isSelected && (
                            <tr>
                            <td colSpan={4} className="p-0">
                            <div className="bg-gray-50 border-t border-gray-200 px-3 py-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-gray-600">{member.name} 상세내역</span>
                                <button
                                  onClick={() => setIsAdding(true)}
                                  className="flex items-center gap-1 px-2 py-1 bg-emerald-600 text-white text-xs rounded hover:bg-emerald-700 transition-colors"
                                >
                                  <Plus size={12} />
                                  추가
                                </button>
                              </div>
                              <div className="overflow-auto max-h-[280px] rounded-lg border border-gray-200 bg-white">
                                <table className="table w-full text-xs">
                                  <thead className="sticky top-0 z-10 bg-gray-50">
                                    <tr>
                                      <th className="text-center">구분</th>
                                      <th className="text-center">날짜</th>
                                      <th className="text-center">4시이후</th>
                                      <th className="text-center">벌금</th>
                                      <th className="text-center">관리</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {isAdding && (
                                      <tr className="bg-emerald-50">
                                        <td className="text-center">
                                          <select
                                            value={newType}
                                            onChange={(e) => {
                                              setNewType(e.target.value as PenaltyType)
                                              if (e.target.value === 'late') setNewAfter4pm(false)
                                            }}
                                            className="text-xs border border-gray-300 rounded px-1 py-1 w-full"
                                          >
                                            <option value="cancel">당일취소</option>
                                            <option value="late">지각</option>
                                          </select>
                                        </td>
                                        <td className="text-center">
                                          <input
                                            type="date"
                                            value={newDate}
                                            onChange={(e) => setNewDate(e.target.value)}
                                            className="text-xs border border-gray-300 rounded px-1 py-1 w-full"
                                          />
                                        </td>
                                        <td className="text-center">
                                          <input
                                            type="checkbox"
                                            checked={newAfter4pm}
                                            onChange={(e) => setNewAfter4pm(e.target.checked)}
                                            disabled={newType !== 'cancel'}
                                            className="w-4 h-4 accent-orange-500"
                                          />
                                        </td>
                                        <td className="text-center text-gray-300">-</td>
                                        <td className="text-center">
                                          <div className="flex items-center justify-center gap-1">
                                            <button onClick={handleAdd} className="px-1.5 py-0.5 text-xs bg-emerald-600 text-white rounded">저장</button>
                                            <button onClick={() => setIsAdding(false)} className="px-1.5 py-0.5 text-xs bg-gray-300 text-gray-700 rounded">취소</button>
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                    {memberPenalties.length === 0 && !isAdding ? (
                                      <tr>
                                        <td colSpan={5} className="text-center py-6 text-gray-400">기록이 없습니다.</td>
                                      </tr>
                                    ) : (
                                      memberPenalties.map((penalty) => (
                                        <tr key={penalty.id} className="hover:bg-gray-50">
                                          <td className="text-center">
                                            <span className={`badge text-xs ${penaltyTypeColors[penalty.type]}`}>
                                              {penaltyTypeLabels[penalty.type]}
                                            </span>
                                          </td>
                                          <td className="text-center whitespace-nowrap">{penalty.date}</td>
                                          <td className="text-center">
                                            {penalty.type === 'cancel' ? (
                                              <input type="checkbox" checked={penalty.after_4pm} onChange={(e) => handleToggle(penalty.id, 'after_4pm', e.target.checked)} className="w-4 h-4 accent-orange-500" />
                                            ) : <span className="text-gray-300">-</span>}
                                          </td>
                                          <td className="text-center">
                                            {penalty.after_4pm ? (
                                              <input type="checkbox" checked={penalty.fine_paid} onChange={(e) => handleToggle(penalty.id, 'fine_paid', e.target.checked)} className="w-4 h-4 accent-emerald-500" />
                                            ) : <span className="text-gray-300">-</span>}
                                          </td>
                                          <td className="text-center">
                                            <button onClick={() => handleDelete(penalty.id)} className="p-1 text-gray-400 hover:text-red-600 rounded"><Trash2 size={14} /></button>
                                          </td>
                                        </tr>
                                      ))
                                    )}
                                  </tbody>
                                </table>
                              </div>
                              <div className="mt-1 text-xs text-gray-400 text-right">{memberPenalties.length}건</div>
                            </div>
                            </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    })}
                    </tbody>
                  </table>
                )}
              </div>
              <div className="px-4 py-2 text-xs text-gray-500 border-t border-gray-200 bg-gray-50">
                {memberSummaries.length}명
              </div>
            </div>
          </div>

          {/* 데스크탑: 좌우 분할 */}
          <div className="hidden md:grid md:grid-cols-3 gap-4">
            {/* 좌측: 회원 목록 */}
            <div className="card p-0 overflow-hidden md:col-span-1">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h2 className="text-sm font-semibold text-gray-700">회원별 현황</h2>
              </div>
              <div className="overflow-auto h-[480px]">
                {memberSummaries.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-sm">해당 데이터가 없습니다.</div>
                ) : (
                  <table className="table w-full">
                    <thead className="sticky top-0 z-10 bg-gray-50">
                      <tr>
                        <th className="text-left">이름</th>
                        <th className="text-center">당일취소</th>
                        <th className="text-center">지각</th>
                      </tr>
                    </thead>
                    <tbody>
                      {memberSummaries.map(({ member, cancelCount, lateCount }) => (
                        <tr
                          key={member.id}
                          className={`cursor-pointer transition-colors ${
                            selectedMemberId === member.id
                              ? 'bg-emerald-50'
                              : 'hover:bg-gray-50'
                          }`}
                          onClick={() => {
                            setSelectedMemberId(member.id)
                            setIsAdding(false)
                          }}
                        >
                          <td className="font-medium">{member.name}</td>
                          <td className="text-center">
                            {cancelCount > 0 ? (
                              <span className="text-red-600 font-semibold">{cancelCount}</span>
                            ) : (
                              <span className="text-gray-300">0</span>
                            )}
                          </td>
                          <td className="text-center">
                            {lateCount > 0 ? (
                              <span className="text-yellow-600 font-semibold">{lateCount}</span>
                            ) : (
                              <span className="text-gray-300">0</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <div className="px-4 py-2 text-xs text-gray-500 border-t border-gray-200 bg-gray-50">
                {memberSummaries.length}명
              </div>
            </div>

            {/* 우측: 상세 */}
            <div className="card p-0 overflow-hidden md:col-span-2">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700">
                  {selectedMember ? `${selectedMember.name} 상세내역` : '상세내역'}
                </h2>
                {selectedMemberId && (
                  <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    <Plus size={14} />
                    추가
                  </button>
                )}
              </div>

              {!selectedMemberId ? (
                <div className="p-8 text-center text-gray-400 text-sm h-[480px] flex items-center justify-center">
                  좌측에서 회원을 선택해주세요.
                </div>
              ) : (
                <div className="overflow-auto h-[480px]">
                  <table className="table w-full">
                    <thead className="sticky top-0 z-10 bg-gray-50">
                      <tr>
                        <th className="text-center">구분</th>
                        <th className="text-center">날짜</th>
                        <th className="text-center">4시이후취소</th>
                        <th className="text-center">벌금납입</th>
                        <th className="text-center">관리</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isAdding && (
                        <tr className="bg-emerald-50">
                          <td className="text-center">
                            <select
                              value={newType}
                              onChange={(e) => {
                                setNewType(e.target.value as PenaltyType)
                                if (e.target.value === 'late') setNewAfter4pm(false)
                              }}
                              className="text-xs border border-gray-300 rounded px-2 py-1"
                            >
                              <option value="cancel">당일취소</option>
                              <option value="late">지각</option>
                            </select>
                          </td>
                          <td className="text-center">
                            <input
                              type="date"
                              value={newDate}
                              onChange={(e) => setNewDate(e.target.value)}
                              className="text-xs border border-gray-300 rounded px-2 py-1"
                            />
                          </td>
                          <td className="text-center">
                            <input
                              type="checkbox"
                              checked={newAfter4pm}
                              onChange={(e) => setNewAfter4pm(e.target.checked)}
                              disabled={newType !== 'cancel'}
                              className="w-4 h-4 accent-orange-500"
                            />
                          </td>
                          <td className="text-center text-gray-300">-</td>
                          <td className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={handleAdd}
                                className="px-2 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700"
                              >
                                저장
                              </button>
                              <button
                                onClick={() => setIsAdding(false)}
                                className="px-2 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                              >
                                취소
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                      {selectedPenalties.length === 0 && !isAdding ? (
                        <tr>
                          <td colSpan={5} className="text-center py-8 text-gray-400">
                            기록이 없습니다.
                          </td>
                        </tr>
                      ) : (
                        selectedPenalties.map((penalty) => (
                          <tr key={penalty.id} className="hover:bg-gray-50">
                            <td className="text-center">
                              <span className={`badge ${penaltyTypeColors[penalty.type]}`}>
                                {penaltyTypeLabels[penalty.type]}
                              </span>
                            </td>
                            <td className="text-center">{penalty.date}</td>
                            <td className="text-center">
                              {penalty.type === 'cancel' ? (
                                <input
                                  type="checkbox"
                                  checked={penalty.after_4pm}
                                  onChange={(e) => handleToggle(penalty.id, 'after_4pm', e.target.checked)}
                                  className="w-4 h-4 accent-orange-500"
                                />
                              ) : (
                                <span className="text-gray-300">-</span>
                              )}
                            </td>
                            <td className="text-center">
                              {penalty.after_4pm ? (
                                <input
                                  type="checkbox"
                                  checked={penalty.fine_paid}
                                  onChange={(e) => handleToggle(penalty.id, 'fine_paid', e.target.checked)}
                                  className="w-4 h-4 accent-emerald-500"
                                />
                              ) : (
                                <span className="text-gray-300">-</span>
                              )}
                            </td>
                            <td className="text-center">
                              <button
                                onClick={() => handleDelete(penalty.id)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="삭제"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="px-4 py-2 text-xs text-gray-500 border-t border-gray-200 bg-gray-50">
                {selectedMemberId ? `${selectedPenalties.length}건` : '-'}
              </div>
            </div>
          </div>
        </>
      )}

      {/* 추가 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-[90%] max-w-md mx-4" onClick={() => setIsModalDropdownOpen(false)}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">당일취소/지각 추가</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <label className="block text-sm font-medium text-gray-700 mb-1">회원</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="이름/닉네임 검색"
                    value={modalMemberSearch}
                    onChange={(e) => {
                      setModalMemberSearch(e.target.value)
                      setIsModalDropdownOpen(true)
                      if (!e.target.value) setModalMemberId('')
                    }}
                    onFocus={() => setIsModalDropdownOpen(true)}
                    className="w-full py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    style={{ paddingLeft: '34px', paddingRight: '32px' }}
                  />
                  {modalMemberSearch && (
                    <button
                      onClick={() => { setModalMemberSearch(''); setModalMemberId(''); setIsModalDropdownOpen(false) }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                {isModalDropdownOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-auto">
                    {members
                      .filter(m => {
                        if (!modalMemberSearch) return true
                        return m.name.includes(modalMemberSearch) || (m.nickname && m.nickname.includes(modalMemberSearch))
                      })
                      .map(m => (
                        <button
                          key={m.id}
                          onClick={() => {
                            setModalMemberId(m.id)
                            setModalMemberSearch(m.name + (m.nickname ? ` (${m.nickname})` : ''))
                            setIsModalDropdownOpen(false)
                          }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-emerald-50 transition-colors ${
                            modalMemberId === m.id ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-700'
                          }`}
                        >
                          {m.name}{m.nickname ? ` (${m.nickname})` : ''}
                        </button>
                      ))
                    }
                    {members.filter(m => !modalMemberSearch || m.name.includes(modalMemberSearch) || (m.nickname && m.nickname.includes(modalMemberSearch))).length === 0 && (
                      <div className="px-3 py-2 text-sm text-gray-400">검색 결과 없음</div>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">구분</label>
                <select
                  value={modalType}
                  onChange={(e) => {
                    setModalType(e.target.value as PenaltyType)
                    if (e.target.value === 'late') setModalAfter4pm(false)
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="cancel">당일취소</option>
                  <option value="late">지각</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">날짜</label>
                <input
                  type="date"
                  value={modalDate}
                  onChange={(e) => setModalDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              {modalType === 'cancel' && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={modalAfter4pm}
                    onChange={(e) => setModalAfter4pm(e.target.checked)}
                    className="w-4 h-4 accent-orange-500"
                  />
                  <span className="text-sm text-gray-700">4시 이후 취소</span>
                </label>
              )}
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleModalAdd}
                className="px-4 py-2 text-sm text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
