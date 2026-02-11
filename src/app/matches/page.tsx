'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import {
  Users,
  UserPlus,
  Search,
  X,
  Shuffle,
  Clock,
  Trophy,
  ChevronDown,
  ChevronUp,
  RotateCcw
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { Member, MemberLevel, MemberGender } from '@/types/database'

// 실력 라벨
const levelLabels: Record<MemberLevel, string> = {
  rally_x: '랠리X',
  rally_o: '랠리O',
  very_beginner: '왕초심',
  beginner: '초심',
  d_class: 'D조',
  c_class: 'C조',
  b_class: 'B조',
  a_class: 'A조',
}

// 실력 점수 (매칭용)
const levelScore: Record<MemberLevel, number> = {
  rally_x: 1,
  rally_o: 2,
  very_beginner: 3,
  beginner: 4,
  d_class: 5,
  c_class: 6,
  b_class: 7,
  a_class: 8,
}

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
  level: MemberLevel
  isGuest: boolean
  isLate: boolean
  gamesBeforeArrival: number // 지각 시 도착 전 평균 게임 수
  gamesPlayed: number // 배정된 게임 수
  menDoubles: number // 남복 횟수
  womenDoubles: number // 여복 횟수
  mixedDoubles: number // 혼복 횟수
  lastMatchRound: number // 마지막 배정 라운드
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

  // 기본 설정
  const [courtCount, setCourtCount] = useState(2)
  const [totalGames, setTotalGames] = useState(20)

  // 회원 검색
  const [members, setMembers] = useState<Member[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  // 게스트 입력
  const [guestName, setGuestName] = useState('')
  const [guestGender, setGuestGender] = useState<MemberGender>('male')
  const [guestLevel, setGuestLevel] = useState<MemberLevel>('beginner')

  // 참석자 목록
  const [attendees, setAttendees] = useState<Attendee[]>([])

  // 지각자 설정 모달
  const [lateSettingId, setLateSettingId] = useState<string | null>(null)
  const [lateGamesInput, setLateGamesInput] = useState(0)

  // 생성된 대진표
  const [matches, setMatches] = useState<GeneratedMatch[]>([])
  const [isGenerated, setIsGenerated] = useState(false)

  // UI 상태
  const [showSettings, setShowSettings] = useState(true)

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

  // 검색 드롭다운 외부 클릭 처리
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 회원 검색 결과
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
      level: member.level,
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
      level: guestLevel,
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
    setAttendees(attendees.filter(a => a.id !== id))
  }

  // 지각 토글
  const toggleLate = (id: string) => {
    const attendee = attendees.find(a => a.id === id)
    if (!attendee) return

    if (!attendee.isLate) {
      // 지각으로 변경 - 게임 수 입력 모달 표시
      setLateSettingId(id)
      setLateGamesInput(0)
    } else {
      // 지각 해제
      setAttendees(attendees.map(a =>
        a.id === id ? { ...a, isLate: false, gamesBeforeArrival: 0 } : a
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

  // 대진표 생성 알고리즘
  const generateMatches = () => {
    if (attendees.length < 4) {
      alert('최소 4명 이상이 필요합니다.')
      return
    }

    // 참석자 초기화 (지각자는 gamesPlayed 유지)
    const players = attendees.map(a => ({
      ...a,
      gamesPlayed: a.isLate ? a.gamesBeforeArrival : 0,
      menDoubles: 0,
      womenDoubles: 0,
      mixedDoubles: 0,
      lastMatchRound: -999,
    }))

    const generatedMatches: GeneratedMatch[] = []
    const totalRounds = Math.ceil(totalGames / courtCount)

    for (let round = 1; round <= totalRounds; round++) {
      const matchesThisRound = Math.min(courtCount, totalGames - generatedMatches.length)
      if (matchesThisRound <= 0) break

      for (let court = 1; court <= matchesThisRound; court++) {
        // 이번 라운드에 배정 가능한 선수들 (이전 라운드에서 쉬었어야 함)
        // 코트 수에 따라 최소 휴식 라운드 계산
        const minRestRounds = courtCount >= 2 ? 1 : 0 // 코트가 2개 이상이면 최소 1라운드 휴식

        let availablePlayers = players.filter(p => {
          const roundsSinceLastMatch = round - p.lastMatchRound
          // 이번 라운드에 이미 배정된 선수 제외
          const alreadyInThisRound = generatedMatches
            .filter(m => m.round === round)
            .some(m =>
              m.team1.some(t => t.id === p.id) ||
              m.team2.some(t => t.id === p.id)
            )
          return roundsSinceLastMatch > minRestRounds && !alreadyInThisRound
        })

        if (availablePlayers.length < 4) {
          // 휴식 조건 완화
          availablePlayers = players.filter(p => {
            // 이번 라운드에 이미 배정된 선수 제외
            const alreadyInThisRound = generatedMatches
              .filter(m => m.round === round)
              .some(m =>
                m.team1.some(t => t.id === p.id) ||
                m.team2.some(t => t.id === p.id)
              )
            return !alreadyInThisRound
          })

          if (availablePlayers.length < 4) continue
        }

        // 게임 수가 적은 선수 우선 선택
        availablePlayers.sort((a, b) => a.gamesPlayed - b.gamesPlayed)

        // 매치 타입 결정 (남복/여복/혼복 균형)
        const males = availablePlayers.filter(p => p.gender === 'male')
        const females = availablePlayers.filter(p => p.gender === 'female')

        let matchType: 'men' | 'women' | 'mixed'
        let selectedPlayers: typeof availablePlayers = []

        // 각 타입별 진행 횟수 계산
        const totalMen = players.reduce((sum, p) => sum + p.menDoubles, 0) / 4
        const totalWomen = players.reduce((sum, p) => sum + p.womenDoubles, 0) / 4
        const totalMixed = players.reduce((sum, p) => sum + p.mixedDoubles, 0) / 4

        // 혼복 우선 (남녀 각 2명 이상일 때)
        if (males.length >= 2 && females.length >= 2 && totalMixed <= totalMen && totalMixed <= totalWomen) {
          matchType = 'mixed'
          // 게임 수가 적은 남녀 각 2명씩 선택
          const selectedMales = males.slice(0, 2)
          const selectedFemales = females.slice(0, 2)

          // 실력 균형: 강한 남 + 약한 여 vs 약한 남 + 강한 여
          selectedMales.sort((a, b) => levelScore[b.level] - levelScore[a.level])
          selectedFemales.sort((a, b) => levelScore[b.level] - levelScore[a.level])

          selectedPlayers = [selectedMales[0], selectedFemales[1], selectedMales[1], selectedFemales[0]]
        } else if (males.length >= 4 && (totalMen <= totalWomen || females.length < 4)) {
          matchType = 'men'
          selectedPlayers = males.slice(0, 4)
        } else if (females.length >= 4 && (totalWomen <= totalMen || males.length < 4)) {
          matchType = 'women'
          selectedPlayers = females.slice(0, 4)
        } else if (males.length >= 2 && females.length >= 2) {
          matchType = 'mixed'
          selectedPlayers = [...males.slice(0, 2), ...females.slice(0, 2)]
        } else if (males.length >= 4) {
          matchType = 'men'
          selectedPlayers = males.slice(0, 4)
        } else if (females.length >= 4) {
          matchType = 'women'
          selectedPlayers = females.slice(0, 4)
        } else {
          continue // 매치 구성 불가
        }

        if (selectedPlayers.length < 4) continue

        // 팀 구성 (실력 균형)
        let team1: [Attendee, Attendee]
        let team2: [Attendee, Attendee]

        if (matchType === 'mixed') {
          // 혼복: 실력 기반으로 이미 정렬됨
          team1 = [selectedPlayers[0], selectedPlayers[1]] // 강남 + 약여
          team2 = [selectedPlayers[2], selectedPlayers[3]] // 약남 + 강여
        } else {
          // 동성 복식: 실력 균형 (1+4 vs 2+3)
          selectedPlayers.sort((a, b) => levelScore[b.level] - levelScore[a.level])
          team1 = [selectedPlayers[0], selectedPlayers[3]]
          team2 = [selectedPlayers[1], selectedPlayers[2]]
        }

        // 매치 추가
        const match: GeneratedMatch = {
          round,
          court,
          team1,
          team2,
          matchType,
        }
        generatedMatches.push(match)

        // 선수 상태 업데이트
        const allPlayersInMatch = [...team1, ...team2]
        allPlayersInMatch.forEach(p => {
          const playerIdx = players.findIndex(pl => pl.id === p.id)
          if (playerIdx !== -1) {
            players[playerIdx].gamesPlayed++
            players[playerIdx].lastMatchRound = round
            if (matchType === 'men') players[playerIdx].menDoubles++
            else if (matchType === 'women') players[playerIdx].womenDoubles++
            else players[playerIdx].mixedDoubles++
          }
        })
      }
    }

    // 최종 상태 반영
    setAttendees(players)
    setMatches(generatedMatches)
    setIsGenerated(true)
  }

  // 대진표 초기화
  const resetMatches = () => {
    setMatches([])
    setIsGenerated(false)
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
  const guestCount = attendees.filter(a => a.isGuest).length

  return (
    <div className="space-y-4 md:space-y-6">
      <h1 className="text-xl md:text-2xl font-bold text-gray-800">대진표</h1>

      {/* 설정 섹션 */}
      <div className="card">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setShowSettings(!showSettings)}
        >
          <h2 className="text-base md:text-lg font-semibold text-gray-700">설정</h2>
          {showSettings ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>

        {showSettings && (
          <div className="mt-4 space-y-4">
            {/* 코트 수 & 게임 수 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">코트 수</label>
                <select
                  className="input"
                  value={courtCount}
                  onChange={(e) => setCourtCount(Number(e.target.value))}
                >
                  <option value={1}>1개</option>
                  <option value={2}>2개</option>
                  <option value={3}>3개</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">총 게임 수</label>
                <input
                  type="number"
                  className="input"
                  value={totalGames}
                  onChange={(e) => setTotalGames(Number(e.target.value))}
                  min={1}
                  max={100}
                />
              </div>
            </div>

            {/* 회원 검색 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Users size={16} className="inline mr-1" />
                회원 추가
              </label>
              <div className="relative" ref={searchRef}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  className="input pl-10"
                  placeholder="이름/닉네임 검색..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setShowSearchDropdown(true)
                  }}
                  onFocus={() => setShowSearchDropdown(true)}
                />
                {showSearchDropdown && searchTerm && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-auto">
                    {filteredMembers.length === 0 ? (
                      <div className="p-3 text-sm text-gray-500">검색 결과 없음</div>
                    ) : (
                      filteredMembers.slice(0, 10).map(member => (
                        <div
                          key={member.id}
                          className="p-3 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                          onClick={() => addMember(member)}
                        >
                          <div>
                            <span className="font-medium">{member.name}</span>
                            {member.nickname && (
                              <span className="text-gray-500 ml-1">({member.nickname})</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className={member.gender === 'male' ? 'text-blue-600' : 'text-pink-600'}>
                              {genderLabels[member.gender || 'male']}
                            </span>
                            <span className="text-gray-500">{levelLabels[member.level]}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 게스트 추가 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <UserPlus size={16} className="inline mr-1" />
                게스트 추가
              </label>
              <div className="flex flex-col md:flex-row gap-2">
                <input
                  type="text"
                  className="input flex-1"
                  placeholder="게스트 이름"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addGuest()}
                />
                <div className="flex gap-2">
                  <select
                    className="input w-20"
                    value={guestGender}
                    onChange={(e) => setGuestGender(e.target.value as MemberGender)}
                  >
                    <option value="male">남</option>
                    <option value="female">여</option>
                  </select>
                  <select
                    className="input flex-1 md:w-24"
                    value={guestLevel}
                    onChange={(e) => setGuestLevel(e.target.value as MemberLevel)}
                  >
                    {Object.entries(levelLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                  <button
                    onClick={addGuest}
                    className="btn btn-secondary whitespace-nowrap"
                  >
                    추가
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 참석자 목록 */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base md:text-lg font-semibold text-gray-700">
            참석자 ({attendees.length}명)
          </h2>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-blue-600">남 {maleCount}</span>
            <span className="text-pink-600">여 {femaleCount}</span>
            {guestCount > 0 && <span className="text-orange-600">게스트 {guestCount}</span>}
          </div>
        </div>

        {attendees.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            참석자를 추가해주세요
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {attendees.map(attendee => (
              <div
                key={attendee.id}
                className={`
                  relative p-3 rounded-lg border-2 transition-all
                  ${attendee.isGuest
                    ? 'bg-orange-50 border-orange-200'
                    : 'bg-white border-gray-200'
                  }
                  ${attendee.isLate ? 'opacity-60' : ''}
                `}
              >
                {/* 삭제 버튼 */}
                <button
                  onClick={() => removeAttendee(attendee.id)}
                  className="absolute top-1 right-1 p-1 text-gray-400 hover:text-red-500"
                >
                  <X size={16} />
                </button>

                {/* 이름 */}
                <div className="font-medium text-gray-800 pr-6">
                  {attendee.name}
                  {attendee.nickname && (
                    <span className="text-gray-500 text-sm ml-1">({attendee.nickname})</span>
                  )}
                </div>

                {/* 정보 */}
                <div className="flex items-center gap-2 mt-1 text-xs">
                  <span className={attendee.gender === 'male' ? 'text-blue-600 font-medium' : 'text-pink-600 font-medium'}>
                    {genderLabels[attendee.gender]}
                  </span>
                  <span className="text-gray-500">{levelLabels[attendee.level]}</span>
                  {attendee.isGuest && (
                    <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded">게스트</span>
                  )}
                </div>

                {/* 지각 버튼 & 게임 수 */}
                <div className="flex items-center justify-between mt-2">
                  <button
                    onClick={() => toggleLate(attendee.id)}
                    className={`
                      flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors
                      ${attendee.isLate
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-yellow-50'
                      }
                    `}
                  >
                    <Clock size={12} />
                    {attendee.isLate ? `지각 (+${attendee.gamesBeforeArrival})` : '지각'}
                  </button>
                  {isGenerated && (
                    <span className="text-xs text-gray-500">
                      {attendee.gamesPlayed}게임
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 생성 버튼 */}
      <div className="flex gap-2">
        <button
          onClick={generateMatches}
          disabled={attendees.length < 4}
          className="btn btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Shuffle size={18} />
          대진표 생성
        </button>
        {isGenerated && (
          <button
            onClick={resetMatches}
            className="btn btn-secondary flex items-center gap-2"
          >
            <RotateCcw size={18} />
            초기화
          </button>
        )}
      </div>

      {/* 생성된 대진표 */}
      {isGenerated && matches.length > 0 && (
        <div className="card">
          <h2 className="text-base md:text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Trophy size={20} className="text-yellow-500" />
            대진표 ({matches.length}게임)
          </h2>

          <div className="space-y-4">
            {/* 라운드별 그룹화 */}
            {Array.from(new Set(matches.map(m => m.round))).map(round => (
              <div key={round} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 font-medium text-gray-700">
                  {round}라운드
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-3">
                  {matches
                    .filter(m => m.round === round)
                    .map((match, idx) => (
                      <div
                        key={`${round}-${match.court}`}
                        className={`
                          p-3 rounded-lg border-2
                          ${match.matchType === 'men' ? 'bg-blue-50 border-blue-200' :
                            match.matchType === 'women' ? 'bg-pink-50 border-pink-200' :
                            'bg-purple-50 border-purple-200'}
                        `}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-500">
                            코트 {match.court}
                          </span>
                          <span className={`
                            text-xs px-2 py-0.5 rounded-full
                            ${match.matchType === 'men' ? 'bg-blue-200 text-blue-700' :
                              match.matchType === 'women' ? 'bg-pink-200 text-pink-700' :
                              'bg-purple-200 text-purple-700'}
                          `}>
                            {match.matchType === 'men' ? '남복' :
                             match.matchType === 'women' ? '여복' : '혼복'}
                          </span>
                        </div>

                        {/* Team 1 */}
                        <div className="mb-2">
                          <div className="text-sm font-medium">
                            {match.team1[0].name}
                            {match.team1[0].isGuest && <span className="text-orange-500 ml-1">*</span>}
                            <span className="text-gray-400 mx-1">&</span>
                            {match.team1[1].name}
                            {match.team1[1].isGuest && <span className="text-orange-500 ml-1">*</span>}
                          </div>
                        </div>

                        <div className="text-center text-gray-400 text-xs">vs</div>

                        {/* Team 2 */}
                        <div className="mt-2">
                          <div className="text-sm font-medium">
                            {match.team2[0].name}
                            {match.team2[0].isGuest && <span className="text-orange-500 ml-1">*</span>}
                            <span className="text-gray-400 mx-1">&</span>
                            {match.team2[1].name}
                            {match.team2[1].isGuest && <span className="text-orange-500 ml-1">*</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>

          {/* 개인별 통계 */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <h3 className="font-medium text-gray-700 mb-3">개인별 게임 수</h3>
            <div className="flex flex-wrap gap-2">
              {attendees
                .sort((a, b) => b.gamesPlayed - a.gamesPlayed)
                .map(a => (
                  <span
                    key={a.id}
                    className={`
                      px-2 py-1 rounded text-sm
                      ${a.isGuest ? 'bg-orange-100' : 'bg-gray-100'}
                    `}
                  >
                    {a.name}: <strong>{a.gamesPlayed}</strong>
                    <span className="text-xs text-gray-500 ml-1">
                      (남{a.menDoubles}/여{a.womenDoubles}/혼{a.mixedDoubles})
                    </span>
                  </span>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* 지각 설정 모달 */}
      {lateSettingId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-4">지각 설정</h3>
            <p className="text-sm text-gray-600 mb-4">
              도착 전까지 다른 참석자들이 평균 몇 게임을 진행했나요?
            </p>
            <input
              type="number"
              className="input mb-4"
              value={lateGamesInput}
              onChange={(e) => setLateGamesInput(Number(e.target.value))}
              min={0}
              max={20}
              placeholder="게임 수"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setLateSettingId(null)}
                className="btn btn-secondary flex-1"
              >
                취소
              </button>
              <button
                onClick={saveLateSettings}
                className="btn btn-primary flex-1"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 도움말 */}
      <div className="text-xs md:text-sm text-gray-500 hidden md:block">
        * 게스트 표시 | 지각자는 도착 전 평균 게임 수만큼 이미 플레이한 것으로 계산
      </div>
    </div>
  )
}
