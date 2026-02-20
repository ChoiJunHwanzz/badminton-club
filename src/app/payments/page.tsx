'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { Search, Check, X, ChevronLeft, ChevronRight, Users, CheckCircle, AlertCircle, Wallet, ListChecks, RotateCcw, ChevronUp, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { Member, MemberStatus } from '@/types/database'
import BulkPaymentModal from '@/components/BulkPaymentModal'

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

// 납입 상태
type PaymentStatus = 'paid' | 'unpaid'

const paymentStatusLabels: Record<PaymentStatus, string> = {
  paid: '완료',
  unpaid: '미납',
}

const paymentStatusColors: Record<PaymentStatus, string> = {
  paid: 'bg-emerald-100 text-emerald-800',
  unpaid: 'bg-red-100 text-red-800',
}

// 회비 금액 고정
const PAYMENT_AMOUNT = 3000

type MemberPayment = Member & {
  paymentId: string | null
  paymentStatus: PaymentStatus
}

type SortField = 'name' | 'nickname' | 'join_date' | 'status' | 'paymentStatus'
type SortOrder = 'asc' | 'desc'

// 날짜 헬퍼
const getCurrentMonth = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const formatMonthLabel = (month: string) => {
  const [year, m] = month.split('-')
  return `${year}년 ${parseInt(m)}월`
}

const getPrevMonth = (month: string) => {
  const [year, m] = month.split('-').map(Number)
  const date = new Date(year, m - 2, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

const getNextMonth = (month: string) => {
  const [year, m] = month.split('-').map(Number)
  const date = new Date(year, m, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

// 가입월이 조회월 이전인지 확인 (조회월에 가입한 회원도 포함)
const isJoinedBeforeMonth = (joinDate: string, targetMonth: string) => {
  if (!joinDate) return false
  const joinMonth = joinDate.substring(0, 7) // YYYY-MM
  return joinMonth <= targetMonth
}

export default function PaymentsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | 'all'>('all')
  const [members, setMembers] = useState<MemberPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [showActive, setShowActive] = useState(true)
  const [showLeft, setShowLeft] = useState(true)

  const supabase = createClient()

  // 초기화
  const handleReset = () => {
    setSelectedMonth(getCurrentMonth())
    setPaymentFilter('all')
    setSearchTerm('')
    setSortField(null)
    setSortOrder('asc')
    setShowActive(true)
    setShowLeft(true)
  }

  // 정렬
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortOrder === 'asc') {
        setSortOrder('desc')
      } else {
        setSortField(null)
        setSortOrder('asc')
      }
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="w-4" />
    return sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
  }

  // 회원 + 해당 월 납부 정보 조회
  const fetchData = async () => {
    setLoading(true)

    // 활동 회원만 조회
    const { data: membersData, error: membersError } = await supabase
      .from('members')
      .select('*')
      .order('name', { ascending: true })

    if (membersError) {
      console.error('Error fetching members:', membersError)
      setLoading(false)
      return
    }

    // 해당 월 납부 정보 조회
    const { data: paymentsData, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .eq('payment_month', selectedMonth)

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError)
    }

    // 병합
    const merged: MemberPayment[] = (membersData || []).map(member => {
      const payment = paymentsData?.find(p => p.member_id === member.id)
      return {
        ...member,
        paymentId: payment?.id || null,
        paymentStatus: payment?.status === 'paid' ? 'paid' : 'unpaid',
      }
    })

    setMembers(merged)
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [selectedMonth])

  // 조회월 기준 대상 회원 (해당 월 이전 가입자만)
  const eligibleMembers = members.filter(member =>
    isJoinedBeforeMonth(member.join_date, selectedMonth)
  )

  // 필터링 + 정렬된 회원 목록
  const filteredMembers = eligibleMembers
    .filter(member => {
      // 검색 필터
      const matchesSearch = member.name.includes(searchTerm) ||
        (member.nickname && member.nickname.includes(searchTerm))
      // 납입 상태 필터
      const matchesPayment = paymentFilter === 'all' || member.paymentStatus === paymentFilter
      // 활동상태 필터
      const matchesStatus = (showActive && member.status === 'active') || (showLeft && (member.status === 'left' || member.status === 'kicked'))

      return matchesSearch && matchesPayment && matchesStatus
    })
    .sort((a, b) => {
      // 사용자가 특정 필드로 정렬 선택한 경우
      if (sortField) {
        let aVal: string = String(a[sortField] || '')
        let bVal: string = String(b[sortField] || '')

        let compare = 0
        if (sortOrder === 'asc') {
          compare = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
        } else {
          compare = aVal > bVal ? -1 : aVal < bVal ? 1 : 0
        }

        // 같은 값이면 가입일로 2차 정렬
        if (compare === 0) {
          return (a.join_date || '').localeCompare(b.join_date || '')
        }
        return compare
      }

      // 기본 정렬: 가입일 빠른 순 → 이름순
      const dateCompare = (a.join_date || '').localeCompare(b.join_date || '')
      if (dateCompare !== 0) return dateCompare
      return a.name.localeCompare(b.name)
    })

  // 통계 (대상 회원 기준)
  const paidCount = eligibleMembers.filter(m => m.paymentStatus === 'paid').length
  const unpaidCount = eligibleMembers.filter(m => m.paymentStatus === 'unpaid').length

  // 납부 처리
  const handlePayment = async (member: MemberPayment, newStatus: PaymentStatus) => {
    const statusLabel = newStatus === 'paid' ? '납부 완료' : '미납'
    if (!confirm(`${member.name}님을 ${statusLabel} 처리하시겠습니까?`)) return

    if (member.paymentId) {
      // 기존 데이터 업데이트
      const { error } = await supabase
        .from('payments')
        .update({
          status: newStatus,
          paid_date: newStatus === 'paid' ? new Date().toISOString().split('T')[0] : null,
        })
        .eq('id', member.paymentId)

      if (error) {
        alert('처리 실패: ' + error.message)
        return
      }
    } else {
      // 신규 데이터 삽입
      const { error } = await supabase
        .from('payments')
        .insert({
          member_id: member.id,
          payment_month: selectedMonth,
          amount: PAYMENT_AMOUNT,
          status: newStatus,
          paid_date: newStatus === 'paid' ? new Date().toISOString().split('T')[0] : null,
        })

      if (error) {
        alert('처리 실패: ' + error.message)
        return
      }
    }

    fetchData()
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <h1 className="text-xl md:text-2xl font-bold text-gray-800">회비관리</h1>

      {/* 통계 카드 - 최상단 꽉 차게 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        <div
          className={`card text-center cursor-pointer transition-all hover:shadow-md ${paymentFilter === 'all' ? 'ring-2 ring-gray-400' : ''}`}
          onClick={() => setPaymentFilter('all')}
        >
          <div className="flex items-center justify-center gap-2 mb-1">
            <Users size={18} className="text-gray-500" />
            <span className="text-sm text-gray-500">전체</span>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-gray-800">{eligibleMembers.length}명</p>
        </div>
        <div
          className={`card text-center cursor-pointer transition-all hover:shadow-md ${paymentFilter === 'paid' ? 'ring-2 ring-emerald-500' : ''}`}
          onClick={() => setPaymentFilter('paid')}
        >
          <div className="flex items-center justify-center gap-2 mb-1">
            <CheckCircle size={18} className="text-emerald-500" />
            <span className="text-sm text-gray-500">완료</span>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-emerald-600">{paidCount}명</p>
        </div>
        <div
          className={`card text-center cursor-pointer transition-all hover:shadow-md ${paymentFilter === 'unpaid' ? 'ring-2 ring-red-400' : ''}`}
          onClick={() => setPaymentFilter('unpaid')}
        >
          <div className="flex items-center justify-center gap-2 mb-1">
            <AlertCircle size={18} className="text-red-500" />
            <span className="text-sm text-gray-500">미납</span>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-red-600">{unpaidCount}명</p>
        </div>
        <div className="card text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Wallet size={18} className="text-blue-500" />
            <span className="text-sm text-gray-500">총수입</span>
          </div>
          <p className="text-xs text-gray-400 mb-1 hidden md:block">{formatMonthLabel(selectedMonth)}</p>
          <p className="text-xl md:text-2xl font-bold text-blue-600">{(paidCount * PAYMENT_AMOUNT).toLocaleString()}원</p>
        </div>
      </div>

      {/* 검색 필터: 납부월 + 이름/닉네임 */}
      <div className="flex flex-col md:flex-row gap-2 md:gap-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 md:gap-2 bg-white border border-gray-200 rounded-lg px-2 md:px-4 py-2 shadow-sm">
            <button
              onClick={() => setSelectedMonth(getPrevMonth(selectedMonth))}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm md:text-lg font-semibold text-gray-800 min-w-[90px] md:min-w-[120px] text-center">
              {formatMonthLabel(selectedMonth)}
            </span>
            <button
              onClick={() => setSelectedMonth(getNextMonth(selectedMonth))}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <button
            onClick={handleReset}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors md:hidden"
            title="초기화"
          >
            <RotateCcw size={18} />
          </button>
        </div>
        <div className="flex items-center gap-2 flex-1">
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
          <button
            onClick={handleReset}
            className="hidden md:flex items-center gap-1 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            title="초기화"
          >
            <RotateCcw size={18} />
            <span className="text-sm">초기화</span>
          </button>
          <div className="hidden md:block flex-1" />
          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm"
          >
            <ListChecks size={16} />
            <span className="hidden md:inline">일괄납부</span>
            <span className="md:hidden">일괄</span>
          </button>
        </div>
      </div>

      {/* 회비 목록 */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">로딩 중...</div>
        ) : (
          <div className="table-container overflow-auto h-[400px] md:h-[480px]">
            <table className="table">
              <thead className="sticky top-0 z-10 bg-gray-50">
                <tr>
                  <th
                    className="whitespace-nowrap text-left cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      이름 <SortIcon field="name" />
                    </div>
                  </th>
                  <th
                    className="whitespace-nowrap text-left cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('nickname')}
                  >
                    <div className="flex items-center gap-1">
                      닉네임 <SortIcon field="nickname" />
                    </div>
                  </th>
                  <th
                    className="whitespace-nowrap text-center cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('join_date')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      가입일자 <SortIcon field="join_date" />
                    </div>
                  </th>
                  <th
                    className="whitespace-nowrap text-center cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      활동상태 <SortIcon field="status" />
                    </div>
                  </th>
                  <th className="whitespace-nowrap text-center">월</th>
                  <th className="whitespace-nowrap text-center">금액</th>
                  <th
                    className="whitespace-nowrap text-center cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('paymentStatus')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      납입상태 <SortIcon field="paymentStatus" />
                    </div>
                  </th>
                  <th className="whitespace-nowrap text-center">관리</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-gray-500">
                      {members.length === 0 ? '조회된 회원이 없습니다.' : '검색 결과가 없습니다.'}
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="font-medium">{member.name}</td>
                      <td>{member.nickname || '-'}</td>
                      <td className="text-center">{member.join_date || '-'}</td>
                      <td className="text-center">
                        <span className={`badge ${statusColors[member.status]}`}>
                          {statusLabels[member.status]}
                        </span>
                      </td>
                      <td className="text-center">{selectedMonth}</td>
                      <td className="text-center">{PAYMENT_AMOUNT.toLocaleString()}원</td>
                      <td className="text-center">
                        <span className={`badge ${paymentStatusColors[member.paymentStatus]}`}>
                          {paymentStatusLabels[member.paymentStatus]}
                        </span>
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handlePayment(member, 'paid')}
                            className={`p-1.5 rounded ${member.paymentStatus === 'paid' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                            title="납부 처리"
                          >
                            <Check size={18} />
                          </button>
                          <button
                            onClick={() => handlePayment(member, 'unpaid')}
                            className={`p-1.5 rounded ${member.paymentStatus === 'unpaid' ? 'text-red-600 bg-red-50' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}
                            title="미납 처리"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 py-2 text-xs text-gray-500 border-t border-gray-200 bg-gray-50">
          조회결과: {filteredMembers.length}건{(!showActive || !showLeft) || paymentFilter !== 'all' || searchTerm ? ` / 전체 ${eligibleMembers.length}건` : ''}
        </div>
      </div>

      {/* 도움말 */}
      <div className="text-xs md:text-sm text-gray-500 hidden md:block">
        💡 카드 클릭 → 필터 적용 | 헤더 클릭 → 정렬 | 체크 아이콘 → 납부 처리 | X 아이콘 → 미납 처리
      </div>

      {/* 일괄 납부 모달 */}
      <BulkPaymentModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onSuccess={fetchData}
        defaultMonth={selectedMonth}
      />
    </div>
  )
}
