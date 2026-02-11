'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import {
  Users,
  UserPlus,
  Search,
  X,
  Play,
  Settings,
  Clock,
  Trophy,
  GripVertical,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Plus,
  Minus
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { Member, MemberGender } from '@/types/database'

// 성별 라벨
const genderLabels: Record<MemberGender, string> = {
  male: '남',
  female: '여',
}

// 참석자 타입
interface Attendee {
  id: string
  name: string
  nickname?: string | null
  gender: MemberGender
  rank: number // 실력 순위 (1이 가장 높음)
  isGuest: boolean
  isLate: boolean
  gamesBeforeArrival: number
  gamesPlayed: number
  menDoubles: number
  womenDoubles: number
  mixedDoubles: number
  lastMatchRound: number
}

// 생성된 매치 타입
interface GeneratedMatch {
  round: number
  court: number
  team1: [Attendee, Attendee]
  team2: [Attendee, Attendee]
  matchType: 'men' | 'women' | 'mixed'
}

export default function MatchesPage() {
  const supabase = createClient()

  // 설정
  const [courtCount, setCourtCount] = useState(2)
  const [showSettingsModal, setShowSettingsModal] = useState(false)

  // 회원 데이터
  const [members, setMembers] = useState<Member[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  // 게스트 입력
  const [guestName, setGuestName] = useState('')
  const [guestGender, setGuestGender] = useState<MemberGender>('male')

  // 참석자 목록
  const [attendees, setAttendees] = useState<Attendee[]>([])

  // 지각자 설정
  const [lateSettingId, setLateSettingId] = useState<string | null>(null)
  const [lateGamesInput, setLateGamesInput] = useState(0)

  // 대진표
  const [matches, setMatches] = useState<GeneratedMatch[]>([])
  const [currentRound, setCurrentRound] = useState(0)

  // 드래그 상태
  const [draggedId, setDraggedId] = useState<string | null>(null)

  // 회원 목록 조회
  useEffect(() => {
    const fetchMembers = async () => {
      const { data } = await supabase
        .from('members')
        .select('*')
        .eq('status', 'active')
        .order('name')
      if (data) setMembers(data)
    }
    fetchMembers()
  }, [])

  // 검색 드롭다운 외부 클릭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 검색 결과
  const filteredMembers = members.filter(m =>
    !attendees.some(a => a.id === m.id) &&
    (m.name.includes(searchTerm) || (m.nickname && m.nickname.includes(searchTerm)))
  )

  // 회원 추가
  const addMember = (member: Member) => {
    const newAttendee: Attendee = {
      id: member.id,
      name: member.name,
      nickname: member.nickname,
      gender: member.gender || 'male',
      rank: attendees.length + 1,
      isGuest: false,
      isLate: false,
      gamesBeforeArrival: 0,
      gamesPlayed: 0,
      menDoubles: 0,
      womenDoubles: 0,
      mixedDoubles: 0,
      lastMatchRound: -999,
    }
    setAttendees([...attendees, newAttendee])
    setSearchTerm('')
    setShowSearchDropdown(false)
  }

  // 게스트 추가
  const addGuest = () => {
    if (!guestName.trim()) return
    const newAttendee: Attendee = {
      id: `guest_${Date.now()}`,
      name: guestName.trim(),
      nickname: null,
      gender: guestGender,
      rank: attendees.length + 1,
      isGuest: true,
      isLate: false,
      gamesBeforeArrival: 0,
      gamesPlayed: 0,
      menDoubles: 0,
      womenDoubles: 0,
      mixedDoubles: 0,
      lastMatchRound: -999,
    }
    setAttendees([...attendees, newAttendee])
    setGuestName('')
  }

  // 참석자 제거
  const removeAttendee = (id: string) => {
    const filtered = attendees.filter(a => a.id !== id)
    // 순위 재정렬
    const reranked = filtered.map((a, idx) => ({ ...a, rank: idx + 1 }))
    setAttendees(reranked)
  }

  // 순위 변경 (드래그 or 버튼)
  const moveRank = (id: string, direction: 'up' | 'down') => {
    const idx = attendees.findIndex(a => a.id === id)
    if (idx === -1) return
    if (direction === 'up' && idx === 0) return
    if (direction === 'down' && idx === attendees.length - 1) return

    const newAttendees = [...attendees]
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    ;[newAttendees[idx], newAttendees[swapIdx]] = [newAttendees[swapIdx], newAttendees[idx]]

    // 순위 재정렬
    const reranked = newAttendees.map((a, i) => ({ ...a, rank: i + 1 }))
    setAttendees(reranked)
  }

  // 지각 토글
  const toggleLate = (id: string) => {
    const attendee = attendees.find(a => a.id === id)
    if (!attendee) return

    if (!attendee.isLate) {
      setLateSettingId(id)
      setLateGamesInput(0)
    } else {
      setAttendees(attendees.map(a =>
        a.id === id ? { ...a, isLate: false, gamesBeforeArrival: 0, gamesPlayed: 0 } : a
      ))
    }
  }

  // 지각 설정 저장
  const saveLateSettings = () => {
    if (lateSettingId) {
      setAttendees(attendees.map(a =>
        a.id === lateSettingId
          ? { ...a, isLate: true, gamesBeforeArrival: lateGamesInput, gamesPlayed: lateGamesInput }
          : a
      ))
      setLateSettingId(null)
    }
  }

  // 다음 라운드 생성
  const generateNextRound = () => {
    if (attendees.length < 4) {
      alert('최소 4명 이상이 필요합니다.')
      return
    }

    const nextRound = currentRound + 1
    const players = [...attendees]
    const newMatches: GeneratedMatch[] = []

    // 코트 수만큼 매치 생성
    for (let court = 1; court <= courtCount; court++) {
      // 이번 라운드에 배정 가능한 선수들
      const minRestRounds = courtCount >= 2 ? 1 : 0

      let availablePlayers = players.filter(p => {
        const roundsSinceLastMatch = nextRound - p.lastMatchRound
        const alreadyInThisRound = newMatches.some(m =>
          m.team1.some(t => t.id === p.id) || m.team2.some(t => t.id === p.id)
        )
        return roundsSinceLastMatch > minRestRounds && !alreadyInThisRound
      })

      if (availablePlayers.length < 4) {
        // 휴식 조건 완화
        availablePlayers = players.filter(p => {
          const alreadyInThisRound = newMatches.some(m =>
            m.team1.some(t => t.id === p.id) || m.team2.some(t => t.id === p.id)
          )
          return !alreadyInThisRound
        })
        if (availablePlayers.length < 4) continue
      }

      // 게임 수 적은 사람 우선
      availablePlayers.sort((a, b) => a.gamesPlayed - b.gamesPlayed)

      // 매치 타입 결정
      const males = availablePlayers.filter(p => p.gender === 'male')
      const females = availablePlayers.filter(p => p.gender === 'female')

      const totalMen = players.reduce((sum, p) => sum + p.menDoubles, 0)
      const totalWomen = players.reduce((sum, p) => sum + p.womenDoubles, 0)
      const totalMixed = players.reduce((sum, p) => sum + p.mixedDoubles, 0)

      let matchType: 'men' | 'women' | 'mixed'
      let selectedPlayers: Attendee[] = []

      if (males.length >= 2 && females.length >= 2 && totalMixed <= totalMen && totalMixed <= totalWomen) {
        matchType = 'mixed'
        const selectedMales = males.slice(0, 2)
        const selectedFemales = females.slice(0, 2)
        selectedMales.sort((a, b) => a.rank - b.rank)
        selectedFemales.sort((a, b) => a.rank - b.rank)
        selectedPlayers = [selectedMales[0], selectedFemales[1] || selectedFemales[0], selectedMales[1] || selectedMales[0], selectedFemales[0]]
      } else if (males.length >= 4 && (totalMen <= totalWomen || females.length < 4)) {
        matchType = 'men'
        selectedPlayers = males.slice(0, 4)
      } else if (females.length >= 4) {
        matchType = 'women'
        selectedPlayers = females.slice(0, 4)
      } else if (males.length >= 2 && females.length >= 2) {
        matchType = 'mixed'
        selectedPlayers = [...males.slice(0, 2), ...females.slice(0, 2)]
      } else if (males.length >= 4) {
        matchType = 'men'
        selectedPlayers = males.slice(0, 4)
      } else {
        continue
      }

      if (selectedPlayers.length < 4) continue

      // 팀 구성 (순위 기반 밸런스)
      let team1: [Attendee, Attendee]
      let team2: [Attendee, Attendee]

      if (matchType === 'mixed') {
        team1 = [selectedPlayers[0], selectedPlayers[1]]
        team2 = [selectedPlayers[2], selectedPlayers[3]]
      } else {
        selectedPlayers.sort((a, b) => a.rank - b.rank)
        team1 = [selectedPlayers[0], selectedPlayers[3]]
        team2 = [selectedPlayers[1], selectedPlayers[2]]
      }

      const match: GeneratedMatch = { round: nextRound, court, team1, team2, matchType }
      newMatches.push(match)

      // 선수 상태 업데이트
      ;[...team1, ...team2].forEach(p => {
        const idx = players.findIndex(pl => pl.id === p.id)
        if (idx !== -1) {
          players[idx].gamesPlayed++
          players[idx].lastMatchRound = nextRound
          if (matchType === 'men') players[idx].menDoubles++
          else if (matchType === 'women') players[idx].womenDoubles++
          else players[idx].mixedDoubles++
        }
      })
    }

    if (newMatches.length > 0) {
      setAttendees(players)
      setMatches([...matches, ...newMatches])
      setCurrentRound(nextRound)
    }
  }

  // 전체 초기화
  const resetAll = () => {
    if (!confirm('대진표를 초기화하시겠습니까?')) return
    setMatches([])
    setCurrentRound(0)
    setAttendees(attendees.map(a => ({
      ...a,
      gamesPlayed: a.isLate ? a.gamesBeforeArrival : 0,
      menDoubles: 0,
      womenDoubles: 0,
      mixedDoubles: 0,
      lastMatchRound: -999,
    })))
  }

  // 통계
  const maleCount = attendees.filter(a => a.gender === 'male').length
  const femaleCount = attendees.filter(a => a.gender === 'female').length

  return (
    <div className="min-h-screen bg-slate-900 -m-4 md:-m-6 p-4 md:p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
          <Trophy className="text-yellow-400" size={24} />
          대진표
        </h1>
        <button
          onClick={() => setShowSettingsModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
        >
          <Settings size={18} />
          <span className="hidden md:inline">설정</span>
        </button>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 참석자 패널 */}
        <div className="lg:col-span-1 bg-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              참석자 <span className="text-blue-400">({attendees.length})</span>
            </h2>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-blue-400">♂ {maleCount}</span>
              <span className="text-pink-400">♀ {femaleCount}</span>
            </div>
          </div>

          {/* 참석자 목록 */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {attendees.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                설정에서 참석자를 추가하세요
              </div>
            ) : (
              attendees.map((a, idx) => (
                <div
                  key={a.id}
                  className={`
                    flex items-center gap-2 p-2 rounded-lg transition-all
                    ${a.isGuest ? 'bg-orange-900/30 border border-orange-700/50' : 'bg-slate-700/50'}
                    ${a.isLate ? 'opacity-50' : ''}
                  `}
                >
                  {/* 순위 */}
                  <div className="flex flex-col items-center">
                    <button
                      onClick={() => moveRank(a.id, 'up')}
                      className="text-slate-500 hover:text-white p-0.5"
                      disabled={idx === 0}
                    >
                      <ChevronUp size={14} />
                    </button>
                    <span className="text-xs font-bold text-blue-400 w-5 text-center">{a.rank}</span>
                    <button
                      onClick={() => moveRank(a.id, 'down')}
                      className="text-slate-500 hover:text-white p-0.5"
                      disabled={idx === attendees.length - 1}
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>

                  {/* 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${a.gender === 'male' ? 'text-blue-300' : 'text-pink-300'}`}>
                        {a.name}
                      </span>
                      {a.isGuest && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-orange-600/50 text-orange-300 rounded">G</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>{genderLabels[a.gender]}</span>
                      {matches.length > 0 && <span>• {a.gamesPlayed}게임</span>}
                    </div>
                  </div>

                  {/* 액션 */}
                  <button
                    onClick={() => toggleLate(a.id)}
                    className={`p-1.5 rounded ${a.isLate ? 'bg-yellow-600/50 text-yellow-300' : 'text-slate-500 hover:text-yellow-400'}`}
                    title={a.isLate ? `지각 (+${a.gamesBeforeArrival})` : '지각 설정'}
                  >
                    <Clock size={14} />
                  </button>
                  <button
                    onClick={() => removeAttendee(a.id)}
                    className="p-1.5 text-slate-500 hover:text-red-400"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* 액션 버튼 */}
          <div className="mt-4 space-y-2">
            <button
              onClick={generateNextRound}
              disabled={attendees.length < 4}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-lg transition-colors"
            >
              <Play size={18} />
              {currentRound === 0 ? '대진표 시작' : `${currentRound + 1}라운드 생성`}
            </button>
            {matches.length > 0 && (
              <button
                onClick={resetAll}
                className="w-full flex items-center justify-center gap-2 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
              >
                <RotateCcw size={16} />
                초기화
              </button>
            )}
          </div>
        </div>

        {/* 대진표 패널 */}
        <div className="lg:col-span-2 bg-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              대진표 {matches.length > 0 && <span className="text-blue-400">({matches.length}게임)</span>}
            </h2>
            <div className="text-sm text-slate-400">
              코트 {courtCount}개
            </div>
          </div>

          {matches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <Trophy size={48} className="mb-4 opacity-30" />
              <p>참석자를 추가하고 대진표를 생성하세요</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {Array.from(new Set(matches.map(m => m.round))).reverse().map(round => (
                <div key={round} className="bg-slate-700/50 rounded-lg overflow-hidden">
                  <div className="bg-slate-600/50 px-4 py-2 font-medium text-white flex items-center justify-between">
                    <span>{round}라운드</span>
                    <span className="text-xs text-slate-400">
                      {matches.filter(m => m.round === round).length}게임
                    </span>
                  </div>
                  <div className="p-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {matches
                      .filter(m => m.round === round)
                      .map((match) => (
                        <div
                          key={`${match.round}-${match.court}`}
                          className={`
                            p-3 rounded-lg border
                            ${match.matchType === 'men'
                              ? 'bg-blue-900/30 border-blue-700/50'
                              : match.matchType === 'women'
                              ? 'bg-pink-900/30 border-pink-700/50'
                              : 'bg-purple-900/30 border-purple-700/50'}
                          `}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-slate-400">
                              코트 {match.court}
                            </span>
                            <span className={`
                              text-xs px-2 py-0.5 rounded-full
                              ${match.matchType === 'men'
                                ? 'bg-blue-600/50 text-blue-300'
                                : match.matchType === 'women'
                                ? 'bg-pink-600/50 text-pink-300'
                                : 'bg-purple-600/50 text-purple-300'}
                            `}>
                              {match.matchType === 'men' ? '남복' : match.matchType === 'women' ? '여복' : '혼복'}
                            </span>
                          </div>

                          <div className="text-sm text-white">
                            <div className="mb-1">
                              {match.team1[0].name}
                              {match.team1[0].isGuest && <span className="text-orange-400">*</span>}
                              <span className="text-slate-500 mx-1">&</span>
                              {match.team1[1].name}
                              {match.team1[1].isGuest && <span className="text-orange-400">*</span>}
                            </div>
                            <div className="text-center text-xs text-slate-500 my-1">VS</div>
                            <div>
                              {match.team2[0].name}
                              {match.team2[0].isGuest && <span className="text-orange-400">*</span>}
                              <span className="text-slate-500 mx-1">&</span>
                              {match.team2[1].name}
                              {match.team2[1].isGuest && <span className="text-orange-400">*</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 개인 통계 */}
          {matches.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-700">
              <h3 className="text-sm font-medium text-slate-400 mb-2">개인별 게임 수</h3>
              <div className="flex flex-wrap gap-2">
                {[...attendees]
                  .sort((a, b) => b.gamesPlayed - a.gamesPlayed)
                  .map(a => (
                    <span
                      key={a.id}
                      className={`
                        px-2 py-1 rounded text-xs
                        ${a.isGuest ? 'bg-orange-900/30 text-orange-300' : 'bg-slate-700 text-slate-300'}
                      `}
                    >
                      {a.name}: <strong className="text-white">{a.gamesPlayed}</strong>
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 설정 모달 */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-start p-4">
          <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-md mt-16 ml-0 md:ml-4 animate-slide-in">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Settings size={20} />
                설정
              </h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* 코트 수 */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">코트 수</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCourtCount(Math.max(1, courtCount - 1))}
                    className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
                  >
                    <Minus size={18} />
                  </button>
                  <input
                    type="number"
                    className="w-20 text-center bg-slate-700 border border-slate-600 text-white rounded-lg py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={courtCount}
                    onChange={(e) => setCourtCount(Math.max(1, Number(e.target.value)))}
                    min={1}
                  />
                  <button
                    onClick={() => setCourtCount(courtCount + 1)}
                    className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>

              {/* 회원 추가 */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  <Users size={14} className="inline mr-1" />
                  회원 추가
                </label>
                <div className="relative" ref={searchRef}>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  <input
                    type="text"
                    className="w-full pl-9 pr-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500"
                    placeholder="이름/닉네임 검색..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value)
                      setShowSearchDropdown(true)
                    }}
                    onFocus={() => setShowSearchDropdown(true)}
                  />
                  {showSearchDropdown && searchTerm && (
                    <div className="absolute z-20 w-full mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-lg max-h-40 overflow-auto">
                      {filteredMembers.length === 0 ? (
                        <div className="p-3 text-sm text-slate-500">검색 결과 없음</div>
                      ) : (
                        filteredMembers.slice(0, 8).map(member => (
                          <div
                            key={member.id}
                            className="p-2 hover:bg-slate-600 cursor-pointer flex items-center justify-between text-sm"
                            onClick={() => addMember(member)}
                          >
                            <span className="text-white">{member.name}</span>
                            <span className={member.gender === 'male' ? 'text-blue-400' : 'text-pink-400'}>
                              {genderLabels[member.gender || 'male']}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 게스트 추가 */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  <UserPlus size={14} className="inline mr-1" />
                  게스트 추가
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500"
                    placeholder="이름"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addGuest()}
                  />
                  <select
                    className="w-16 px-2 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={guestGender}
                    onChange={(e) => setGuestGender(e.target.value as MemberGender)}
                  >
                    <option value="male">남</option>
                    <option value="female">여</option>
                  </select>
                  <button
                    onClick={addGuest}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                  >
                    추가
                  </button>
                </div>
              </div>

              {/* 현재 참석자 목록 미리보기 */}
              {attendees.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    참석자 ({attendees.length}명) - 순위순
                  </label>
                  <div className="bg-slate-700/50 rounded-lg p-2 max-h-32 overflow-y-auto">
                    <div className="flex flex-wrap gap-1">
                      {attendees.map(a => (
                        <span
                          key={a.id}
                          className={`
                            text-xs px-2 py-1 rounded
                            ${a.isGuest ? 'bg-orange-600/30 text-orange-300' : 'bg-slate-600 text-slate-300'}
                          `}
                        >
                          {a.rank}. {a.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    * 순위는 참석자 목록에서 위/아래 버튼으로 조정
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-700">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
              >
                완료
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 지각 설정 모달 */}
      {lateSettingId && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-white mb-4">지각 설정</h3>
            <p className="text-sm text-slate-400 mb-4">
              도착 전까지 평균 몇 게임이 진행되었나요?
            </p>
            <input
              type="number"
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              value={lateGamesInput}
              onChange={(e) => setLateGamesInput(Number(e.target.value))}
              min={0}
              placeholder="게임 수"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setLateSettingId(null)}
                className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                취소
              </button>
              <button
                onClick={saveLateSettings}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
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
