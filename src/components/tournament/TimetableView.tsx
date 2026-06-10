'use client'

import { useState, useMemo } from 'react'
import { GripVertical, AlertTriangle, Flag, Play, RotateCcw, X, BarChart3, ChevronDown, Trophy } from 'lucide-react'
import {
  TournamentGame,
  TimetableBlock,
  GameStatus,
  GameWinner,
  Teams,
  slotTime,
  deriveTeamsFromGames,
  DEFAULT_COURT_COUNT,
} from '@/lib/tournamentData'

interface TimetableViewProps {
  title: string
  eventDate?: string | null
  games: TournamentGame[]
  blocks: TimetableBlock[]
  courtCount?: number
  editable?: boolean
  conflicts?: Set<number>
  teams?: Teams | null
  onReorder?: (from: number, to: number) => void
  onStatusChange?: (index: number, status: GameStatus, winner: GameWinner) => void
}

interface PlayerRecord {
  win: number
  loss: number
}

const ROUND_COLOR = [
  'bg-blue-500',
  'bg-indigo-500',
  'bg-violet-500',
  'bg-pink-500',
  'bg-amber-500',
  'bg-emerald-500',
]

export default function TimetableView({
  title,
  eventDate,
  games,
  blocks,
  courtCount = DEFAULT_COURT_COUNT,
  editable = false,
  conflicts,
  teams,
  onReorder,
  onStatusChange,
}: TimetableViewProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [showIndividual, setShowIndividual] = useState(false)

  const playBlocks = blocks.filter((b) => b.kind === 'play')

  // 팀별 점수(승자팀 +1) + 개인 승패 집계
  const effTeams = useMemo<Teams>(
    () => (teams && teams.team1 ? teams : deriveTeamsFromGames(games)),
    [teams, games]
  )
  const stats = useMemo(() => {
    let s1 = 0
    let s2 = 0
    const rec = new Map<string, PlayerRecord>()
    const bump = (name: string, win: boolean) => {
      const r = rec.get(name) ?? { win: 0, loss: 0 }
      if (win) r.win += 1
      else r.loss += 1
      rec.set(name, r)
    }
    games.forEach((g) => {
      if (g.status !== 'done' || !g.winner) return
      const winTeam = g.winner === 'team1' ? g.team1 : g.team2
      const loseTeam = g.winner === 'team1' ? g.team2 : g.team1
      if (g.winner === 'team1') s1 += 1
      else s2 += 1
      winTeam.forEach((p) => bump(p, true))
      loseTeam.forEach((p) => bump(p, false))
    })
    return { s1, s2, rec }
  }, [games])

  const sortedTeam = (players: string[]): { name: string; rec: PlayerRecord }[] =>
    [...players]
      .sort((a, b) => a.localeCompare(b, 'ko'))
      .map((name) => ({ name, rec: stats.rec.get(name) ?? { win: 0, loss: 0 } }))

  const handleDrop = (to: number) => {
    if (dragIndex !== null && dragIndex !== to && onReorder) {
      onReorder(dragIndex, to)
    }
    setDragIndex(null)
    setOverIndex(null)
  }

  const applyStatus = (status: GameStatus, winner: GameWinner) => {
    if (editIndex !== null && onStatusChange) {
      onStatusChange(editIndex, status, winner)
    }
    setEditIndex(null)
  }

  const editGame = editIndex !== null ? games[editIndex] : null

  return (
    <div className="space-y-6">
      {/* 제목 */}
      <div className="text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center justify-center gap-2">
          <span>🏸</span>
          <span>{title}</span>
        </h2>
        {eventDate && <p className="text-gray-500 mt-1 text-sm">{eventDate}</p>}
        {/* 상태 범례 */}
        <div className="flex items-center justify-center gap-3 mt-3 text-xs text-gray-500 flex-wrap">
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-gray-100 border border-gray-300" /> 대기
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-amber-100 border border-amber-400" /> 진행중
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-400" /> 종료(🏆 승팀)
          </span>
          {editable && <span className="text-gray-400">· 카드 드래그=순서변경, 클릭=상태변경</span>}
        </div>

        {/* 팀별 스코어 + 개인현황 토글 */}
        <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
          <div className="inline-flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-5 py-2 shadow-sm">
            <span className="text-sm font-bold text-blue-700">{effTeams.team1.name}</span>
            <span className="text-2xl font-black text-blue-700 tabular-nums">{stats.s1}</span>
            <span className="text-gray-300 font-bold">:</span>
            <span className="text-2xl font-black text-red-600 tabular-nums">{stats.s2}</span>
            <span className="text-sm font-bold text-red-600">{effTeams.team2.name}</span>
          </div>
          <button
            onClick={() => setShowIndividual((v) => !v)}
            className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg px-3 py-2 transition-colors"
          >
            <BarChart3 size={15} />
            개인현황보기
            <ChevronDown size={15} className={`transition-transform ${showIndividual ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* 개인별 승패 (팀별 좌/우, 이름순) */}
        {showIndividual && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 text-left">
            {([
              { team: effTeams.team1, accent: 'blue' as const },
              { team: effTeams.team2, accent: 'red' as const },
            ]).map(({ team, accent }) => (
              <div key={team.name} className="border border-gray-200 rounded-xl overflow-hidden">
                <div
                  className={`px-3 py-2 text-sm font-bold ${
                    accent === 'blue' ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-600'
                  }`}
                >
                  {team.name}
                </div>
                <div className="divide-y divide-gray-100">
                  {sortedTeam(team.players).map(({ name, rec }) => (
                    <div key={name} className="flex items-center justify-between px-3 py-1.5 text-sm">
                      <span className="text-gray-700">{name}</span>
                      <span className="tabular-nums text-xs">
                        <span className="font-bold text-emerald-600">{rec.win}승</span>
                        <span className="text-gray-300 mx-1">·</span>
                        <span className="font-bold text-gray-400">{rec.loss}패</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 코트별 대진 */}
      {playBlocks.map((block) => {
        const rounds = block.rounds ?? []
        const tsList: number[] = []
        rounds.forEach((r) => {
          tsList.push((r - 1) * 2, (r - 1) * 2 + 1)
        })
        return (
          <div key={block.label} className="card">
            <div className="flex items-baseline gap-3 mb-4 pb-2 border-b border-gray-200">
              <span className="text-lg font-bold text-emerald-600 tabular-nums">
                {block.start} ~ {block.end}
              </span>
              <span className="text-sm font-semibold text-gray-500">{block.label}</span>
            </div>

            <div className="space-y-4">
              {tsList.map((ts) => {
                const round = Math.floor(ts / 2) + 1
                const { start, end } = slotTime(ts)
                return (
                  <div key={ts} className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    {/* 시간/라운드 */}
                    <div className="flex sm:flex-col items-center sm:items-start gap-2 sm:w-24 shrink-0 pt-1">
                      <span className="text-sm font-bold text-gray-600 tabular-nums">
                        {start}
                        <span className="hidden sm:inline"> ~ {end}</span>
                      </span>
                      <span
                        className={`text-[11px] font-bold text-white px-2 py-0.5 rounded-full ${
                          ROUND_COLOR[(round - 1) % ROUND_COLOR.length]
                        }`}
                      >
                        R{round}
                      </span>
                    </div>

                    {/* 코트 카드 */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1">
                      {Array.from({ length: courtCount }).map((_, c) => {
                        const index = ts * courtCount + c
                        const game = games[index]
                        if (!game) return <div key={c} />

                        const status: GameStatus = game.status ?? 'scheduled'
                        const winner: GameWinner = game.winner ?? null
                        const hasConflict = conflicts?.has(index) && status === 'scheduled'

                        let cardCls = 'border-gray-200 bg-gray-50'
                        if (status === 'playing') cardCls = 'border-amber-400 bg-amber-50 ring-2 ring-amber-200'
                        else if (status === 'done') cardCls = 'border-emerald-300 bg-emerald-50'
                        else if (hasConflict) cardCls = 'border-red-400 ring-2 ring-red-200 bg-red-50'

                        const team1Win = status === 'done' && winner === 'team1'
                        const team2Win = status === 'done' && winner === 'team2'
                        // 종료 시 진 팀만 회색 처리, 이긴 팀은 원래 팀 색상 유지
                        const team1Cls = team2Win ? 'text-gray-300' : 'text-blue-700'
                        const team2Cls = team1Win ? 'text-gray-300' : 'text-red-600'

                        return (
                          <div
                            key={game.id}
                            draggable={editable}
                            onClick={() => editable && setEditIndex(index)}
                            onDragStart={() => setDragIndex(index)}
                            onDragEnd={() => {
                              setDragIndex(null)
                              setOverIndex(null)
                            }}
                            onDragOver={(e) => {
                              if (!editable) return
                              e.preventDefault()
                              setOverIndex(index)
                            }}
                            onDrop={() => handleDrop(index)}
                            className={`relative rounded-lg border p-2 text-center transition-all ${cardCls} ${
                              editable ? 'cursor-pointer hover:shadow-sm hover:border-emerald-400' : ''
                            } ${dragIndex === index ? 'opacity-40' : ''} ${
                              overIndex === index && dragIndex !== null ? 'ring-2 ring-emerald-400' : ''
                            }`}
                          >
                            <div className="flex items-center justify-center gap-1 mb-1">
                              {editable && <GripVertical size={12} className="text-gray-400" />}
                              <span className="text-[11px] font-bold text-gray-400">{index + 1}경기</span>
                              {hasConflict && <AlertTriangle size={12} className="text-red-500" />}
                            </div>

                            {/* 상태 뱃지 */}
                            {status === 'playing' && (
                              <div className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-200 px-1.5 py-0.5 rounded-full mb-1 animate-pulse">
                                <Play size={9} /> 진행중
                              </div>
                            )}
                            {status === 'done' && (
                              <div className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-200 px-1.5 py-0.5 rounded-full mb-1">
                                종료
                              </div>
                            )}

                            <div className={`text-[13px] font-bold leading-tight flex items-center justify-center gap-1 ${team1Cls}`}>
                              {team1Win && <Trophy size={12} className="text-amber-500" />}
                              {game.team1[0]} · {game.team1[1]}
                            </div>
                            <div className="text-[10px] text-violet-400 font-bold my-0.5">VS</div>
                            <div className={`text-[13px] font-bold leading-tight flex items-center justify-center gap-1 ${team2Cls}`}>
                              {team2Win && <Trophy size={12} className="text-amber-500" />}
                              {game.team2[0]} · {game.team2[1]}
                            </div>
                            <div
                              className={`mt-1.5 inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                hasConflict ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-600'
                              }`}
                            >
                              <Flag size={10} />
                              {game.referee}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* 상태 편집 모달 */}
      {editable && editIndex !== null && editGame && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setEditIndex(null)}
        >
          <div
            className="bg-white rounded-2xl p-5 w-full max-w-xs shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-gray-700">{editIndex + 1}경기 상태</span>
              <button onClick={() => setEditIndex(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="text-center text-sm mb-4">
              <div className="font-bold text-blue-700">{editGame.team1[0]} · {editGame.team1[1]}</div>
              <div className="text-[11px] text-violet-400 font-bold my-0.5">VS</div>
              <div className="font-bold text-red-600">{editGame.team2[0]} · {editGame.team2[1]}</div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => applyStatus('playing', null)}
                className="w-full py-2.5 rounded-lg font-bold text-sm bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center gap-1.5"
              >
                <Play size={15} /> 진행중으로
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => applyStatus('done', 'team1')}
                  className="py-2.5 rounded-lg font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white"
                >
                  🏆 청팀 승
                </button>
                <button
                  onClick={() => applyStatus('done', 'team2')}
                  className="py-2.5 rounded-lg font-bold text-sm bg-red-600 hover:bg-red-700 text-white"
                >
                  🏆 백팀 승
                </button>
              </div>
              <button
                onClick={() => applyStatus('scheduled', null)}
                className="w-full py-2 rounded-lg font-medium text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center gap-1.5"
              >
                <RotateCcw size={14} /> 대기로 되돌리기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
