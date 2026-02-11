'use client'

import { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { Member } from '@/types/database'
import MemberSelect from './MemberSelect'

// 회비 금액 고정
const PAYMENT_AMOUNT = 3000

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

interface BulkPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  defaultMonth: string
}

export default function BulkPaymentModal({
  isOpen,
  onClose,
  onSuccess,
  defaultMonth
}: BulkPaymentModalProps) {
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth)
  const [members, setMembers] = useState<Member[]>([])
  const [selectedMembers, setSelectedMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const supabase = createClient()

  // 회원 목록 조회
  const fetchMembers = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching members:', error)
    } else {
      setMembers(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    if (isOpen) {
      fetchMembers()
      setSelectedMonth(defaultMonth)
      setSelectedMembers([])
    }
  }, [isOpen, defaultMonth])

  // 일괄 납부 처리
  const handleSubmit = async () => {
    if (selectedMembers.length === 0) {
      alert('납부 처리할 회원을 선택해주세요.')
      return
    }

    if (!confirm(`${selectedMembers.length}명을 ${formatMonthLabel(selectedMonth)} 납부 처리하시겠습니까?`)) {
      return
    }

    setSubmitting(true)

    try {
      // 기존 납부 정보 조회
      const { data: existingPayments } = await supabase
        .from('payments')
        .select('member_id')
        .eq('payment_month', selectedMonth)
        .in('member_id', selectedMembers.map(m => m.id))

      const existingMemberIds = new Set(existingPayments?.map(p => p.member_id) || [])

      // 업데이트할 회원과 신규 삽입할 회원 분리
      const toUpdate = selectedMembers.filter(m => existingMemberIds.has(m.id))
      const toInsert = selectedMembers.filter(m => !existingMemberIds.has(m.id))

      // 기존 데이터 업데이트
      if (toUpdate.length > 0) {
        const { error: updateError } = await supabase
          .from('payments')
          .update({
            status: 'paid',
            paid_date: new Date().toISOString().split('T')[0],
          })
          .eq('payment_month', selectedMonth)
          .in('member_id', toUpdate.map(m => m.id))

        if (updateError) throw updateError
      }

      // 신규 데이터 삽입
      if (toInsert.length > 0) {
        const insertData = toInsert.map(member => ({
          member_id: member.id,
          payment_month: selectedMonth,
          amount: PAYMENT_AMOUNT,
          status: 'paid',
          paid_date: new Date().toISOString().split('T')[0],
        }))

        const { error: insertError } = await supabase
          .from('payments')
          .insert(insertData)

        if (insertError) throw insertError
      }

      alert(`${selectedMembers.length}명 납부 처리 완료`)
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error processing payments:', error)
      alert('납부 처리 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* 모달 */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">일괄 납부 처리</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X size={20} />
          </button>
        </div>

        {/* 내용 */}
        <div className="px-6 py-4 space-y-4">
          {/* 월 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              납부월
            </label>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 w-fit">
              <button
                onClick={() => setSelectedMonth(getPrevMonth(selectedMonth))}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-lg font-semibold text-gray-800 min-w-[120px] text-center">
                {formatMonthLabel(selectedMonth)}
              </span>
              <button
                onClick={() => setSelectedMonth(getNextMonth(selectedMonth))}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          {/* 회원 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              납부 대상자 <span className="text-emerald-600">({selectedMembers.length}명 선택)</span>
            </label>
            {loading ? (
              <div className="text-gray-500 text-sm">로딩 중...</div>
            ) : (
              <MemberSelect
                members={members}
                selectedMembers={selectedMembers}
                onChange={setSelectedMembers}
                placeholder="이름 또는 초성으로 검색 (예: ㅎㄱㄷ)"
              />
            )}
            <p className="mt-2 text-xs text-gray-500">
              초성 검색 가능 (예: ㅎㄱㄷ → 홍길동)
            </p>
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="btn btn-secondary"
            disabled={submitting}
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            className="btn btn-primary"
            disabled={submitting || selectedMembers.length === 0}
          >
            {submitting ? '처리 중...' : `${selectedMembers.length}명 납부 처리`}
          </button>
        </div>
      </div>
    </div>
  )
}
