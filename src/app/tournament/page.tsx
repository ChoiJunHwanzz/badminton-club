'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo, useCallback, useSyncExternalStore } from 'react'
import { createClient } from '@/lib/supabase'
import {
  TournamentGame,
  TimetableBlock,
  GameStatus,
  GameWinner,
  Teams,
  DEFAULT_GAMES,
  DEFAULT_BLOCKS,
  DEFAULT_TITLE,
  DEFAULT_COURT_COUNT,
  computeConflicts,
  moveGame,
  genShareToken,
} from '@/lib/tournamentData'
import TimetableView from '@/components/tournament/TimetableView'
import { Copy, Check, ExternalLink, AlertTriangle, RotateCcw, Loader2 } from 'lucide-react'

// 클라이언트 origin (SSR='' → 하이드레이션 안전, setState-in-effect 회피)
const subscribeNoop = () => () => {}
function useOrigin(): string {
  return useSyncExternalStore(
    subscribeNoop,
    () => window.location.origin,
    () => ''
  )
}

interface TournamentRow {
  id: string
  title: string
  event_date: string | null
  share_token: string
  court_count: number
  games: TournamentGame[]
  blocks: TimetableBlock[]
  teams: Teams | null
  status: string
}

export default function TournamentPage() {
  const supabase = useMemo(() => createClient(), [])
  const [row, setRow] = useState<TournamentRow | null>(null)
  const [games, setGames] = useState<TournamentGame[]>([])
  const [loading, setLoading] = useState(true)
  const [tableMissing, setTableMissing] = useState(false)
  const [errMsg, setErrMsg] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [copied, setCopied] = useState(false)
  const origin = useOrigin()
  const shareUrl = row ? `${origin}/share/${row.share_token}` : ''

  const courtCount = row?.court_count ?? DEFAULT_COURT_COUNT
  const conflicts = useMemo(() => computeConflicts(games, courtCount), [games, courtCount])

  // 최초 로드 (없으면 기본 대회 생성)
  useEffect(() => {
    let active = true
    const load = async () => {
      const { data, error } = await supabase
        .from('tournament_schedules')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(1)

      if (!active) return

      if (error) {
        const msg = `${error.code ?? ''} ${error.message ?? ''}`
        if (msg.includes('tournament_schedules') || error.code === '42P01' || error.code === 'PGRST205') {
          setTableMissing(true)
        } else {
          setErrMsg(error.message)
        }
        setLoading(false)
        return
      }

      if (data && data.length > 0) {
        const r = data[0] as TournamentRow
        setRow(r)
        setGames(r.games ?? [])
      } else {
        // 기본 대회 생성
        const token = genShareToken()
        const { data: created, error: ce } = await supabase
          .from('tournament_schedules')
          .insert({
            title: DEFAULT_TITLE,
            share_token: token,
            court_count: DEFAULT_COURT_COUNT,
            games: DEFAULT_GAMES,
            blocks: DEFAULT_BLOCKS,
          })
          .select()
          .single()
        if (!active) return
        if (ce) {
          setErrMsg(ce.message)
        } else {
          const r = created as TournamentRow
          setRow(r)
          setGames(r.games ?? [])
        }
      }
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
  }, [supabase])

  const persist = useCallback(
    async (next: TournamentGame[]) => {
      if (!row) return
      setSaving(true)
      const { error } = await supabase
        .from('tournament_schedules')
        .update({ games: next })
        .eq('id', row.id)
      setSaving(false)
      if (error) {
        setErrMsg(error.message)
      } else {
        setSavedAt(new Date())
      }
    },
    [row, supabase]
  )

  const handleReorder = useCallback(
    (from: number, to: number) => {
      setGames((prev) => {
        const next = moveGame(prev, from, to)
        persist(next)
        return next
      })
    },
    [persist]
  )

  const handleStatusChange = useCallback(
    (index: number, status: GameStatus, winner: GameWinner) => {
      setGames((prev) => {
        const next = prev.map((g, i) => (i === index ? { ...g, status, winner } : g))
        persist(next)
        return next
      })
    },
    [persist]
  )

  const handleReset = useCallback(() => {
    if (!confirm('기본 대진 순서로 되돌릴까요? 현재 변경한 순서는 사라집니다.')) return
    setGames(DEFAULT_GAMES)
    persist(DEFAULT_GAMES)
  }, [persist])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('아래 주소를 복사하세요', shareUrl)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500 gap-2">
        <Loader2 className="animate-spin" size={20} /> 불러오는 중...
      </div>
    )
  }

  if (tableMissing) {
    return (
      <div className="max-w-2xl mx-auto card border-yellow-300 bg-yellow-50">
        <h3 className="text-lg font-bold text-yellow-800 flex items-center gap-2 mb-3">
          <AlertTriangle size={20} /> 테이블 설정이 필요합니다
        </h3>
        <p className="text-sm text-yellow-900 mb-3">
          <code className="bg-yellow-100 px-1 rounded">tournament_schedules</code> 테이블이 아직
          없습니다. Supabase SQL Editor에서 아래 파일을 1회 실행해 주세요.
        </p>
        <pre className="bg-white border border-yellow-200 rounded p-3 text-xs overflow-auto">
docs/ddl/tournament_schedules.sql
        </pre>
        <p className="text-xs text-yellow-700 mt-3">실행 후 이 페이지를 새로고침하면 자동으로 기본 대진이 생성됩니다.</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* 헤더 */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">대진 / 시간표 (담당자)</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            경기 카드를 드래그해서 순서를 바꾸면 공유 화면에 실시간 반영됩니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saving ? (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Loader2 className="animate-spin" size={12} /> 저장 중
            </span>
          ) : savedAt ? (
            <span className="text-xs text-emerald-600 flex items-center gap-1">
              <Check size={12} /> 저장됨
            </span>
          ) : null}
          <button onClick={handleReset} className="btn btn-secondary text-sm flex items-center gap-1">
            <RotateCcw size={14} /> 기본순서
          </button>
        </div>
      </div>

      {/* 공유 링크 */}
      <div className="card flex flex-col sm:flex-row sm:items-center gap-3">
        <span className="text-sm font-semibold text-gray-600 whitespace-nowrap">🔗 공유용 링크</span>
        <input className="input flex-1 text-sm bg-gray-50" value={shareUrl} readOnly />
        <div className="flex gap-2">
          <button onClick={handleCopy} className="btn btn-primary text-sm flex items-center gap-1 whitespace-nowrap">
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? '복사됨' : '복사'}
          </button>
          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary text-sm flex items-center gap-1 whitespace-nowrap"
          >
            <ExternalLink size={14} /> 미리보기
          </a>
        </div>
      </div>

      {/* 충돌 경고 */}
      {conflicts.size > 0 && (
        <div className="card border-red-300 bg-red-50">
          <div className="flex items-center gap-2 text-red-700 font-semibold text-sm">
            <AlertTriangle size={16} />
            같은 시간대 충돌 {Array.from(new Set(Array.from(conflicts).map((i) => Math.floor(i / courtCount)))).length}개
            슬롯
          </div>
          <p className="text-xs text-red-600 mt-1">
            빨간색으로 표시된 경기는 같은 시간대에 선수가 겹치거나 심판이 본인 경기를 뛰는 상태입니다. 순서를 조정해 주세요.
          </p>
        </div>
      )}

      {errMsg && (
        <div className="card border-red-300 bg-red-50 text-sm text-red-700">{errMsg}</div>
      )}

      {/* 시간표 + 대진 (편집 가능) */}
      {row && (
        <TimetableView
          title={row.title}
          eventDate={row.event_date}
          games={games}
          blocks={row.blocks ?? DEFAULT_BLOCKS}
          courtCount={courtCount}
          editable
          conflicts={conflicts}
          teams={row.teams}
          onReorder={handleReorder}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  )
}
