'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { X, RotateCcw, Minus, SmartphoneNfc } from 'lucide-react'

// 세트 결과 타입
interface SetResult {
  team1: number
  team2: number
}

// 배드민턴 규칙: 세트 승리 조건 체크
function isSetWon(score1: number, score2: number): boolean {
  if (score1 >= 25 && score1 - score2 >= 2) return true
  if (score2 >= 25 && score2 - score1 >= 2) return true
  return false
}

// 매치 승리 조건 (3세트 중 2세트 선승)
function getMatchWinner(setResults: SetResult[]): 'team1' | 'team2' | null {
  const team1Wins = setResults.filter(s => s.team1 > s.team2).length
  const team2Wins = setResults.filter(s => s.team2 > s.team1).length
  if (team1Wins >= 2) return 'team1'
  if (team2Wins >= 2) return 'team2'
  return null
}

export default function ScoreboardPage() {
  const router = useRouter()

  // 팀 이름
  const [team1Name, setTeam1Name] = useState('TEAM A')
  const [team2Name, setTeam2Name] = useState('TEAM B')
  const [editingTeam, setEditingTeam] = useState<'team1' | 'team2' | null>(null)
  const [editValue, setEditValue] = useState('')

  // 점수
  const [team1Score, setTeam1Score] = useState(0)
  const [team2Score, setTeam2Score] = useState(0)

  // 세트
  const [currentSet, setCurrentSet] = useState(1)
  const [setResults, setSetResults] = useState<SetResult[]>([])

  // 매치 종료
  const [matchWinner, setMatchWinner] = useState<'team1' | 'team2' | null>(null)

  // 점수 애니메이션
  const [team1Animate, setTeam1Animate] = useState(false)
  const [team2Animate, setTeam2Animate] = useState(false)

  // 세트 종료 모달
  const [showSetEndModal, setShowSetEndModal] = useState(false)
  const [pendingSetResult, setPendingSetResult] = useState<SetResult | null>(null)

  // Screen Wake Lock
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  // 세로 모드 감지
  const [isPortrait, setIsPortrait] = useState(false)

  // 팀 이름 입력 ref
  const editInputRef = useRef<HTMLInputElement>(null)

  // Screen Wake Lock 요청
  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request('screen')
        }
      } catch {
        // Wake Lock 실패해도 무시
      }
    }
    requestWakeLock()

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      wakeLockRef.current?.release()
    }
  }, [])

  // 화면 방향 감지
  useEffect(() => {
    const checkOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth)
    }
    checkOrientation()
    window.addEventListener('resize', checkOrientation)
    return () => window.removeEventListener('resize', checkOrientation)
  }, [])

  // 팀 이름 수정 시 input focus
  useEffect(() => {
    if (editingTeam && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingTeam])

  // 세트 종료 자동 감지
  useEffect(() => {
    if (isSetWon(team1Score, team2Score) && !showSetEndModal && !matchWinner) {
      setPendingSetResult({ team1: team1Score, team2: team2Score })
      setShowSetEndModal(true)
    }
  }, [team1Score, team2Score, showSetEndModal, matchWinner])

  // 점수 증가
  const addScore = useCallback((team: 'team1' | 'team2') => {
    if (matchWinner) return
    if (showSetEndModal) return

    if (team === 'team1') {
      setTeam1Score(prev => prev + 1)
      setTeam1Animate(true)
      setTimeout(() => setTeam1Animate(false), 200)
    } else {
      setTeam2Score(prev => prev + 1)
      setTeam2Animate(true)
      setTimeout(() => setTeam2Animate(false), 200)
    }
  }, [matchWinner, showSetEndModal, team1Score, team2Score])

  // 점수 감소
  const subtractScore = useCallback((team: 'team1' | 'team2', e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    if (matchWinner) return

    if (team === 'team1') {
      setTeam1Score(prev => Math.max(0, prev - 1))
    } else {
      setTeam2Score(prev => Math.max(0, prev - 1))
    }
  }, [matchWinner])

  // 세트 종료 확인
  const confirmSetEnd = useCallback(() => {
    if (!pendingSetResult) return

    const newResults = [...setResults, pendingSetResult]
    setSetResults(newResults)
    setShowSetEndModal(false)
    setPendingSetResult(null)

    // 매치 승리 체크
    const winner = getMatchWinner(newResults)
    if (winner) {
      setMatchWinner(winner)
    } else {
      // 다음 세트로
      setCurrentSet(prev => prev + 1)
      setTeam1Score(0)
      setTeam2Score(0)
    }
  }, [pendingSetResult, setResults])

  // 세트 종료 취소 (점수 유지하고 계속)
  const cancelSetEnd = useCallback(() => {
    setShowSetEndModal(false)
    setPendingSetResult(null)
  }, [])

  // 새 게임
  const resetGame = useCallback(() => {
    setTeam1Score(0)
    setTeam2Score(0)
    setCurrentSet(1)
    setSetResults([])
    setMatchWinner(null)
    setShowSetEndModal(false)
    setPendingSetResult(null)
  }, [])

  // 팀 이름 수정 시작
  const startEditTeamName = (team: 'team1' | 'team2', e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    setEditingTeam(team)
    setEditValue(team === 'team1' ? team1Name : team2Name)
  }

  // 팀 이름 수정 완료
  const finishEditTeamName = () => {
    if (editingTeam && editValue.trim()) {
      if (editingTeam === 'team1') setTeam1Name(editValue.trim())
      else setTeam2Name(editValue.trim())
    }
    setEditingTeam(null)
  }

  // 닫기
  const handleClose = () => {
    router.back()
  }

  // 세트 승수
  const team1SetWins = setResults.filter(s => s.team1 > s.team2).length
  const team2SetWins = setResults.filter(s => s.team2 > s.team1).length

  // 게임 포인트 / 세트 포인트 감지
  const isGamePoint = (score: number, opponentScore: number) => {
    if (score >= 24 && score > opponentScore) return true
    return false
  }

  return (
    <div className="fixed inset-0 bg-gray-950 select-none overflow-hidden" style={{ touchAction: 'manipulation' }}>
      {/* 세로 모드 안내 오버레이 */}
      {isPortrait && (
        <div className="absolute inset-0 z-50 bg-gray-950/95 flex flex-col items-center justify-center text-white gap-4 p-8">
          <SmartphoneNfc size={64} className="text-gray-400 rotate-90" />
          <p className="text-xl font-medium text-gray-300 text-center">
            화면을 가로로 돌려주세요
          </p>
          <p className="text-sm text-gray-500 text-center">
            스코어보드는 가로 모드에 최적화되어 있습니다
          </p>
          <button
            onClick={() => setIsPortrait(false)}
            className="mt-4 px-6 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors"
          >
            그냥 사용하기
          </button>
        </div>
      )}

      {/* 상단 바 */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-3 py-2 bg-gray-950/80 backdrop-blur-sm">
        {/* X 닫기 버튼 */}
        <button
          onClick={handleClose}
          className="p-2 text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-gray-800"
        >
          <X size={24} />
        </button>

        {/* 세트 정보 */}
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-sm font-medium">SET {currentSet}</span>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3].map((setNum) => {
              const result = setResults[setNum - 1]
              const isCurrentSet = setNum === currentSet && !matchWinner
              let dotColor = 'bg-gray-700' // 미진행
              if (result) {
                dotColor = result.team1 > result.team2 ? 'bg-blue-500' : 'bg-red-500'
              } else if (isCurrentSet) {
                dotColor = 'bg-yellow-500 animate-pulse'
              }
              return (
                <div key={setNum} className="flex flex-col items-center gap-0.5">
                  <div className={`w-3 h-3 rounded-full ${dotColor}`} />
                  {result && (
                    <span className="text-[10px] text-gray-500">{result.team1}-{result.team2}</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* 새 게임 버튼 */}
        <button
          onClick={resetGame}
          className="p-2 text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-gray-800"
          title="새 게임"
        >
          <RotateCcw size={20} />
        </button>
      </div>

      {/* 메인 스코어보드 영역 */}
      <div className="flex h-full pt-12">
        {/* Team 1 (Blue) */}
        <div
          className={`
            flex-1 flex flex-col items-center justify-center relative cursor-pointer
            bg-blue-900/50 transition-colors
            ${!matchWinner && !showSetEndModal ? 'active:bg-blue-900/60' : ''}
            ${matchWinner === 'team1' ? 'bg-blue-900/50' : ''}
          `}
          onClick={() => addScore('team1')}
        >
          {/* 세트 승수 표시 */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 flex gap-1">
            {Array.from({ length: team1SetWins }).map((_, i) => (
              <div key={i} className="w-2.5 h-2.5 rounded-full bg-blue-400" />
            ))}
          </div>

          {/* 팀 이름 */}
          {editingTeam === 'team1' ? (
            <input
              ref={editInputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={finishEditTeamName}
              onKeyDown={(e) => e.key === 'Enter' && finishEditTeamName()}
              className="text-blue-200 text-lg md:text-xl font-bold bg-transparent border-b-2 border-blue-400 outline-none text-center w-40 mb-2"
              maxLength={12}
            />
          ) : (
            <button
              onClick={(e) => startEditTeamName('team1', e)}
              className="text-blue-200 text-lg md:text-xl font-bold mb-2 hover:text-blue-100 transition-colors px-3 py-1 rounded"
            >
              {team1Name}
            </button>
          )}

          {/* 점수 */}
          <div className={`transition-transform duration-200 ${team1Animate ? 'animate-score-pulse' : ''}`}>
            <span
              className={`
                text-[7rem] md:text-[10rem] lg:text-[12rem] font-black leading-none tabular-nums
                ${isGamePoint(team1Score, team2Score) ? 'text-yellow-300' : 'text-blue-50'}
                ${matchWinner === 'team1' ? 'text-yellow-400' : ''}
              `}
            >
              {team1Score}
            </span>
          </div>

          {/* 게임 포인트 표시 */}
          {isGamePoint(team1Score, team2Score) && !matchWinner && (
            <span className="text-yellow-400 text-xs font-bold tracking-wider mt-1 animate-pulse">
              GAME POINT
            </span>
          )}

          {/* 마이너스 버튼 */}
          <button
            onClick={(e) => subtractScore('team1', e)}
            onTouchEnd={(e) => subtractScore('team1', e)}
            className={`
              absolute bottom-6 left-1/2 -translate-x-1/2
              flex items-center justify-center w-14 h-14 md:w-16 md:h-16
              rounded-full bg-gray-800/80 border-2 border-gray-600
              text-gray-300 hover:text-white hover:border-gray-400
              active:bg-gray-700 transition-all
              ${matchWinner ? 'opacity-30 pointer-events-none' : ''}
            `}
          >
            <Minus size={24} />
          </button>

          {/* 매치 승리 표시 */}
          {matchWinner === 'team1' && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-yellow-400 font-bold text-2xl tracking-wider">
              WIN!
            </div>
          )}
        </div>

        {/* 중앙 구분선 */}
        <div className="w-[2px] bg-gray-700 relative flex items-center justify-center">
          <div className="absolute bg-gray-800 border border-gray-600 rounded-full px-2 py-1 text-gray-500 text-xs font-bold">
            VS
          </div>
        </div>

        {/* Team 2 (Red) */}
        <div
          className={`
            flex-1 flex flex-col items-center justify-center relative cursor-pointer
            bg-red-900/50 transition-colors
            ${!matchWinner && !showSetEndModal ? 'active:bg-red-900/60' : ''}
            ${matchWinner === 'team2' ? 'bg-red-900/50' : ''}
          `}
          onClick={() => addScore('team2')}
        >
          {/* 세트 승수 표시 */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 flex gap-1">
            {Array.from({ length: team2SetWins }).map((_, i) => (
              <div key={i} className="w-2.5 h-2.5 rounded-full bg-red-400" />
            ))}
          </div>

          {/* 팀 이름 */}
          {editingTeam === 'team2' ? (
            <input
              ref={editInputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={finishEditTeamName}
              onKeyDown={(e) => e.key === 'Enter' && finishEditTeamName()}
              className="text-red-200 text-lg md:text-xl font-bold bg-transparent border-b-2 border-red-400 outline-none text-center w-40 mb-2"
              maxLength={12}
            />
          ) : (
            <button
              onClick={(e) => startEditTeamName('team2', e)}
              className="text-red-200 text-lg md:text-xl font-bold mb-2 hover:text-red-100 transition-colors px-3 py-1 rounded"
            >
              {team2Name}
            </button>
          )}

          {/* 점수 */}
          <div className={`transition-transform duration-200 ${team2Animate ? 'animate-score-pulse' : ''}`}>
            <span
              className={`
                text-[7rem] md:text-[10rem] lg:text-[12rem] font-black leading-none tabular-nums
                ${isGamePoint(team2Score, team1Score) ? 'text-yellow-300' : 'text-red-50'}
                ${matchWinner === 'team2' ? 'text-yellow-400' : ''}
              `}
            >
              {team2Score}
            </span>
          </div>

          {/* 게임 포인트 표시 */}
          {isGamePoint(team2Score, team1Score) && !matchWinner && (
            <span className="text-yellow-400 text-xs font-bold tracking-wider mt-1 animate-pulse">
              GAME POINT
            </span>
          )}

          {/* 마이너스 버튼 */}
          <button
            onClick={(e) => subtractScore('team2', e)}
            onTouchEnd={(e) => subtractScore('team2', e)}
            className={`
              absolute bottom-6 left-1/2 -translate-x-1/2
              flex items-center justify-center w-14 h-14 md:w-16 md:h-16
              rounded-full bg-gray-800/80 border-2 border-gray-600
              text-gray-300 hover:text-white hover:border-gray-400
              active:bg-gray-700 transition-all
              ${matchWinner ? 'opacity-30 pointer-events-none' : ''}
            `}
          >
            <Minus size={24} />
          </button>

          {/* 매치 승리 표시 */}
          {matchWinner === 'team2' && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-yellow-400 font-bold text-2xl tracking-wider">
              WIN!
            </div>
          )}
        </div>
      </div>

      {/* 세트 종료 모달 */}
      {showSetEndModal && pendingSetResult && (
        <div className="absolute inset-0 z-40 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-700">
            <h3 className="text-xl font-bold text-white text-center mb-4">
              세트 {currentSet} 종료!
            </h3>
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="text-center">
                <div className="text-blue-300 text-sm font-medium mb-1">{team1Name}</div>
                <div className={`text-4xl font-black ${pendingSetResult.team1 > pendingSetResult.team2 ? 'text-yellow-400' : 'text-blue-200'}`}>
                  {pendingSetResult.team1}
                </div>
              </div>
              <span className="text-gray-500 text-lg font-bold">:</span>
              <div className="text-center">
                <div className="text-red-300 text-sm font-medium mb-1">{team2Name}</div>
                <div className={`text-4xl font-black ${pendingSetResult.team2 > pendingSetResult.team1 ? 'text-yellow-400' : 'text-red-200'}`}>
                  {pendingSetResult.team2}
                </div>
              </div>
            </div>

            {/* 매치 종료 여부 미리 안내 */}
            {(() => {
              const projectedResults = [...setResults, pendingSetResult]
              const projectedWinner = getMatchWinner(projectedResults)
              if (projectedWinner) {
                return (
                  <div className="text-center mb-4 py-2 bg-yellow-900/30 rounded-lg border border-yellow-700/50">
                    <span className="text-yellow-400 font-bold">
                      {projectedWinner === 'team1' ? team1Name : team2Name} 승리!
                    </span>
                  </div>
                )
              }
              return null
            })()}

            <div className="flex gap-3">
              <button
                onClick={cancelSetEnd}
                className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl font-medium transition-colors"
              >
                계속 진행
              </button>
              <button
                onClick={confirmSetEnd}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-colors"
              >
                세트 종료
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 매치 종료 오버레이 */}
      {matchWinner && (
        <div className="absolute inset-0 z-40 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-700 text-center">
            <div className="text-5xl mb-3">🏆</div>
            <h3 className="text-2xl font-black text-yellow-400 mb-2">
              경기 종료!
            </h3>
            <p className="text-lg text-gray-300 mb-4">
              <span className={matchWinner === 'team1' ? 'text-blue-300 font-bold' : 'text-red-300 font-bold'}>
                {matchWinner === 'team1' ? team1Name : team2Name}
              </span>
              {' '}승리
            </p>

            {/* 세트 결과 */}
            <div className="bg-gray-900/50 rounded-lg p-3 mb-6">
              {setResults.map((result, idx) => (
                <div key={idx} className="flex items-center justify-center gap-3 py-1">
                  <span className="text-gray-500 text-sm w-16 text-right">SET {idx + 1}</span>
                  <span className={`font-bold text-lg w-8 text-right ${result.team1 > result.team2 ? 'text-blue-300' : 'text-gray-500'}`}>
                    {result.team1}
                  </span>
                  <span className="text-gray-600">:</span>
                  <span className={`font-bold text-lg w-8 text-left ${result.team2 > result.team1 ? 'text-red-300' : 'text-gray-500'}`}>
                    {result.team2}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={resetGame}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw size={20} />
              새 게임
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
