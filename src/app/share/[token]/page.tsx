'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  TournamentGame,
  TimetableBlock,
  Teams,
  DEFAULT_BLOCKS,
  DEFAULT_COURT_COUNT,
} from '@/lib/tournamentData'
import TimetableView from '@/components/tournament/TimetableView'
import { Loader2, Radio, SearchX } from 'lucide-react'

interface ShareRow {
  id: string
  title: string
  event_date: string | null
  court_count: number
  games: TournamentGame[]
  blocks: TimetableBlock[]
  teams?: Teams | null
}

export default function SharePage() {
  const params = useParams()
  const token = Array.isArray(params.token) ? params.token[0] : (params.token as string)
  const supabase = useMemo(() => createClient(), [])

  const [row, setRow] = useState<ShareRow | null>(null)
  const [games, setGames] = useState<TournamentGame[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [live, setLive] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  // 토큰으로 1건 조회
  useEffect(() => {
    let active = true
    const load = async () => {
      const { data, error } = await supabase
        .from('tournament_schedules')
        .select('*')
        .eq('share_token', token)
        .single()
      if (!active) return
      if (error || !data) {
        setNotFound(true)
        setLoading(false)
        return
      }
      const r = data as ShareRow
      setRow(r)
      setGames(r.games ?? [])
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
  }, [supabase, token])

  // 실시간 구독
  useEffect(() => {
    if (!row?.id) return
    const channel = supabase
      .channel(`tournament-${row.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tournament_schedules', filter: `id=eq.${row.id}` },
        (payload) => {
          const n = payload.new as Partial<ShareRow>
          if (n.games) setGames(n.games)
          setRow((prev) => (prev ? { ...prev, ...n } : prev))
          setUpdatedAt(new Date())
        }
      )
      .subscribe((status) => {
        setLive(status === 'SUBSCRIBED')
      })
    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, row?.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500 gap-2">
        <Loader2 className="animate-spin" size={20} /> 불러오는 중...
      </div>
    )
  }

  if (notFound || !row) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-gray-500 gap-3 p-8 text-center">
        <SearchX size={48} className="text-gray-300" />
        <p className="text-lg font-semibold text-gray-600">대회를 찾을 수 없습니다</p>
        <p className="text-sm text-gray-400">링크 주소가 올바른지 확인해 주세요.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 실시간 상태 바 */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-200 px-4 py-2 flex items-center justify-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
            live ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
          }`}
        >
          <Radio size={12} className={live ? 'animate-pulse' : ''} />
          {live ? '실시간 반영 중' : '연결 중...'}
        </span>
        {updatedAt && (
          <span className="text-[11px] text-gray-400">
            {updatedAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} 갱신
          </span>
        )}
      </div>

      <div className="max-w-5xl mx-auto p-4 md:p-6">
        <TimetableView
          title={row.title}
          eventDate={row.event_date}
          games={games}
          blocks={row.blocks ?? DEFAULT_BLOCKS}
          courtCount={row.court_count ?? DEFAULT_COURT_COUNT}
          teams={row.teams}
        />
      </div>
    </div>
  )
}
