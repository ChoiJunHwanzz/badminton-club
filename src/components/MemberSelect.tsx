'use client'

import { useState, useRef, useEffect } from 'react'
import { X } from 'lucide-react'
import { Member, MemberStatus } from '@/types/database'

// 초성 추출
const CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']

const getChosung = (str: string): string => {
  return str.split('').map(char => {
    const code = char.charCodeAt(0) - 44032
    if (code < 0 || code > 11171) return char
    return CHO[Math.floor(code / 588)]
  }).join('')
}

// 초성 검색 매칭
const matchChosung = (text: string, search: string): boolean => {
  if (!search) return true
  const textChosung = getChosung(text)
  const searchChosung = getChosung(search)

  // 일반 텍스트 매칭
  if (text.toLowerCase().includes(search.toLowerCase())) return true
  // 초성 매칭
  if (textChosung.includes(searchChosung)) return true

  return false
}

const statusLabels: Record<MemberStatus, string> = {
  active: '활동',
  left: '탈퇴',
  kicked: '강퇴',
}

const statusColors: Record<MemberStatus, string> = {
  active: 'text-emerald-600',
  left: 'text-gray-400',
  kicked: 'text-red-500',
}

interface MemberSelectProps {
  members: Member[]
  selectedMembers: Member[]
  onChange: (members: Member[]) => void
  placeholder?: string
}

export default function MemberSelect({
  members,
  selectedMembers,
  onChange,
  placeholder = '이름 또는 초성 검색...'
}: MemberSelectProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 필터링된 회원 목록 (이미 선택된 회원 제외)
  const filteredMembers = members.filter(member => {
    if (selectedMembers.some(s => s.id === member.id)) return false
    return matchChosung(member.name, searchTerm) ||
      (member.nickname && matchChosung(member.nickname, searchTerm))
  })

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 검색어 변경 시 드롭다운 열기
  useEffect(() => {
    if (searchTerm) {
      setIsOpen(true)
      setHighlightIndex(0)
    }
  }, [searchTerm])

  // 회원 선택
  const selectMember = (member: Member) => {
    onChange([...selectedMembers, member])
    setSearchTerm('')
    setIsOpen(false)
    inputRef.current?.focus()
  }

  // 회원 제거
  const removeMember = (memberId: string) => {
    onChange(selectedMembers.filter(m => m.id !== memberId))
  }

  // 키보드 이벤트
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex(prev => Math.min(prev + 1, filteredMembers.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredMembers[highlightIndex]) {
        selectMember(filteredMembers[highlightIndex])
      }
    } else if (e.key === 'Backspace' && !searchTerm && selectedMembers.length > 0) {
      // 검색어 없을 때 백스페이스로 마지막 선택 회원 제거
      removeMember(selectedMembers[selectedMembers.length - 1].id)
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 선택된 회원 칩 + 입력창 */}
      <div
        className="flex flex-wrap items-center gap-2 min-h-[42px] px-3 py-2 border border-gray-300 rounded-lg bg-white focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-transparent cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {/* 선택된 회원 칩 */}
        {selectedMembers.map(member => (
          <span
            key={member.id}
            className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-800 text-sm rounded-full"
          >
            {member.name}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                removeMember(member.id)
              }}
              className="hover:text-emerald-600"
            >
              <X size={14} />
            </button>
          </span>
        ))}

        {/* 입력창 */}
        <input
          ref={inputRef}
          type="text"
          className="flex-1 min-w-[120px] outline-none text-sm"
          placeholder={selectedMembers.length === 0 ? placeholder : ''}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => searchTerm && setIsOpen(true)}
          onKeyDown={handleKeyDown}
        />
      </div>

      {/* 드롭다운 리스트 */}
      {isOpen && filteredMembers.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
          {filteredMembers.map((member, index) => (
            <div
              key={member.id}
              className={`px-4 py-3 cursor-pointer flex items-center justify-between ${
                index === highlightIndex ? 'bg-emerald-50' : 'hover:bg-gray-50'
              }`}
              onClick={() => selectMember(member)}
              onMouseEnter={() => setHighlightIndex(index)}
            >
              <div>
                <span className="font-medium">{member.name}</span>
                {member.nickname && (
                  <span className="text-gray-400 ml-2">({member.nickname})</span>
                )}
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-400">{member.join_date}</span>
                <span className={statusColors[member.status]}>
                  {statusLabels[member.status]}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 검색 결과 없음 */}
      {isOpen && searchTerm && filteredMembers.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="px-4 py-3 text-gray-500 text-sm text-center">
            검색 결과가 없습니다
          </div>
        </div>
      )}
    </div>
  )
}
