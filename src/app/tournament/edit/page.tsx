'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { getUser } from '@/lib/auth'
import {
  TournamentGame,
  TimetableBlock,
  Teams,
  Team,
  DEFAULT_GAMES,
  DEFAULT_BLOCKS,
  DEFAULT_TITLE,
  DEFAULT_COURT_COUNT,
  DEFAULT_TEAMS,
  deriveTeamsFromGames,
  renamePlayerInGames,
  computeConflicts,
  genShareToken,
} from '@/lib/tournamentData'
import { exportBracketPdf } from '@/lib/exportBracket'
import { Users, Grid3x3, Check, Loader2, AlertTriangle, FileDown } from 'lucide-react'

interface EditRow {
  id: string
  title: string
  event_date: string | null
  share_token: string
  court_count: number
  games: TournamentGame[]
  blocks: TimetableBlock[]
  teams: Teams | null
}

type Patch = Partial<Pick<EditRow, 'games' | 'teams'>>

const emptyTeams = (t: Teams | null | undefined): boolean =>
  !t || !t.team1 || !Array.isArray(t.team1.players) || t.team1.players.length === 0

export default function TournamentEditPage() {
  const supabase = useMemo(() => createClient(), [])
  const [rowId, setRowId] = useState<string | null>(null)
  const [games, setGames] = useState<TournamentGame[]>([])
  const [teams, setTeams] = useState<Teams>(DEFAULT_TEAMS)
  const [courtCount, setCourtCount] = useState(DEFAULT_COURT_COUNT)
  // 팀별인원 탭은 admin만. manager는 대진표수정만 보임.
  const [isAdmin] = useState(() => getUser()?.role === 'admin')
  const [tab, setTab] = useState<'roster' | 'bracket'>(isAdmin ? 'roster' : 'bracket')
  const [loading, setLoading] = useState(true)
  const [columnMissing, setColumnMissing] = useState(false)
  const [tableMissing, setTableMissing] = useState(false)
  const [errMsg, setErrMsg] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)

  // 마지막으로 확정된 팀 명단(이름 변경 전파의 기준값)
  const committedTeams = useRef<Teams>(DEFAULT_TEAMS)

  const conflicts = useMemo(() => computeConflicts(games, courtCount), [games, courtCount])

  // 로드 + 마이그레이션
  useEffect(() => {
    let active = true
    const cols = 'id,title,event_date,share_token,court_count,games,blocks,teams'
    const load = async () => {
      const { data, error } = await supabase
        .from('tournament_schedules')
        .select(cols)
        .order('created_at', { ascending: true })
        .limit(1)

      if (!active) return

      if (error) {
        const msg = `${error.code ?? ''} ${error.message ?? ''}`
        if (error.code === '42703' || msg.includes('teams')) setColumnMissing(true)
        else if (error.code === '42P01' || error.code === 'PGRST205' || msg.includes('tournament_schedules'))
          setTableMissing(true)
        else setErrMsg(error.message)
        setLoading(false)
        return
      }

      let r = data && data.length > 0 ? (data[0] as EditRow) : null

      // 행이 없으면 기본 대회 생성
      if (!r) {
        const { data: created, error: ce } = await supabase
          .from('tournament_schedules')
          .insert({
            title: DEFAULT_TITLE,
            share_token: genShareToken(),
            court_count: DEFAULT_COURT_COUNT,
            games: DEFAULT_GAMES,
            blocks: DEFAULT_BLOCKS,
            teams: DEFAULT_TEAMS,
          })
          .select(cols)
          .single()
        if (!active) return
        if (ce) {
          setErrMsg(ce.message)
          setLoading(false)
          return
        }
        r = created as EditRow
      }

      const gs = r.games ?? []
      setRowId(r.id)
      setGames(gs)
      setCourtCount(r.court_count ?? DEFAULT_COURT_COUNT)

      // teams 마이그레이션: 비어있으면 games에서 추출 후 저장
      if (emptyTeams(r.teams)) {
        const derived = deriveTeamsFromGames(gs)
        setTeams(derived)
        committedTeams.current = derived
        await supabase.from('tournament_schedules').update({ teams: derived }).eq('id', r.id)
      } else {
        setTeams(r.teams as Teams)
        committedTeams.current = r.teams as Teams
      }
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
  }, [supabase])

  const persist = useCallback(
    async (patch: Patch) => {
      if (!rowId) return
      setSaving(true)
      const { error } = await supabase.from('tournament_schedules').update(patch).eq('id', rowId)
      setSaving(false)
      if (error) {
        if (error.code === '42703' || (error.message ?? '').includes('teams')) setColumnMissing(true)
        else setErrMsg(error.message)
      } else {
        setSavedAt(new Date())
      }
    },
    [rowId, supabase]
  )

  // ----- 팀별인원 -----
  const setTeamName = (key: 'team1' | 'team2', name: string) => {
    setTeams((prev) => ({ ...prev, [key]: { ...prev[key], name } }))
  }
  const commitTeamName = () => {
    committedTeams.current = teams
    persist({ teams })
  }
  const setPlayerDraft = (key: 'team1' | 'team2', idx: number, value: string) => {
    setTeams((prev) => {
      const players = prev[key].players.slice()
      players[idx] = value
      return { ...prev, [key]: { ...prev[key], players } }
    })
  }
  const commitPlayer = (key: 'team1' | 'team2', idx: number) => {
    const oldName = committedTeams.current[key].players[idx] ?? ''
    const newName = (teams[key].players[idx] ?? '').trim()
    if (!newName || newName === oldName) {
      // 빈값이면 원복
      if (!newName) setPlayerDraft(key, idx, oldName)
      return
    }
    const nextGames = renamePlayerInGames(games, oldName, newName)
    const nextTeams: Teams = {
      ...teams,
      [key]: {
        ...teams[key],
        players: teams[key].players.map((p, i) => (i === idx ? newName : p)),
      },
    }
    setGames(nextGames)
    setTeams(nextTeams)
    committedTeams.current = nextTeams
    persist({ games: nextGames, teams: nextTeams })
  }

  // ----- 대진표수정 -----
  const updateGame = useCallback(
    (idx: number, mutate: (g: TournamentGame) => TournamentGame) => {
      setGames((prev) => {
        const next = prev.map((g, i) => (i === idx ? mutate(g) : g))
        persist({ games: next })
        return next
      })
    },
    [persist]
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500 gap-2">
        <Loader2 className="animate-spin" size={20} /> 불러오는 중...
      </div>
    )
  }

  if (tableMissing || columnMissing) {
    return (
      <div className="max-w-2xl mx-auto card border-yellow-300 bg-yellow-50">
        <h3 className="text-lg font-bold text-yellow-800 flex items-center gap-2 mb-3">
          <AlertTriangle size={20} /> DB 설정이 필요합니다
        </h3>
        <p className="text-sm text-yellow-900 mb-2">
          Supabase SQL Editor에서 아래 파일을 실행해 주세요.
        </p>
        <pre className="bg-white border border-yellow-200 rounded p-3 text-xs overflow-auto">
{tableMissing ? 'docs/ddl/tournament_schedules.sql' : 'docs/ddl/tournament_teams_column.sql'}
        </pre>
        <p className="text-xs text-yellow-700 mt-3">실행 후 새로고침하면 자동으로 마이그레이션됩니다.</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">대회 관리</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            마스터 데이터(팀 명단·대진)를 수정하면 시간표/공유 화면에 그대로 반영됩니다.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {saving ? (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Loader2 className="animate-spin" size={12} /> 저장 중
            </span>
          ) : savedAt ? (
            <span className="text-xs text-emerald-600 flex items-center gap-1">
              <Check size={12} /> 저장됨
            </span>
          ) : null}
          <button
            onClick={() => exportBracketPdf(games, teams, DEFAULT_TITLE, courtCount)}
            className="btn btn-secondary text-sm flex items-center gap-1"
          >
            <FileDown size={14} /> PDF
          </button>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 border-b border-gray-200">
        {isAdmin && (
          <button
            onClick={() => setTab('roster')}
            className={`px-4 py-2.5 text-sm font-semibold flex items-center gap-1.5 border-b-2 -mb-px transition-colors ${
              tab === 'roster'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users size={16} /> 팀별인원
          </button>
        )}
        <button
          onClick={() => setTab('bracket')}
          className={`px-4 py-2.5 text-sm font-semibold flex items-center gap-1.5 border-b-2 -mb-px transition-colors ${
            tab === 'bracket'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Grid3x3 size={16} /> 대진표수정
        </button>
      </div>

      {errMsg && <div className="card border-red-300 bg-red-50 text-sm text-red-700">{errMsg}</div>}

      {isAdmin && tab === 'roster' ? (
        <RosterTab
          teams={teams}
          onTeamName={setTeamName}
          onTeamNameBlur={commitTeamName}
          onPlayerChange={setPlayerDraft}
          onPlayerBlur={commitPlayer}
        />
      ) : (
        <BracketTab
          games={games}
          teams={teams}
          conflicts={conflicts}
          onUpdateGame={updateGame}
        />
      )}
    </div>
  )
}

// 선수 선택 드롭다운 (최상위 컴포넌트)
function PlayerSelect({
  value,
  options,
  onChange,
}: {
  value: string
  options: string[]
  onChange: (v: string) => void
}) {
  const opts = options.includes(value) ? options : [value, ...options]
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-1 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
    >
      {opts.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  )
}

// 팀 명단 그리드 (최상위 컴포넌트)
function TeamRosterGrid({
  teamKey,
  team,
  accent,
  onTeamName,
  onTeamNameBlur,
  onPlayerChange,
  onPlayerBlur,
}: {
  teamKey: 'team1' | 'team2'
  team: Team
  accent: 'blue' | 'red'
  onTeamName: (key: 'team1' | 'team2', name: string) => void
  onTeamNameBlur: () => void
  onPlayerChange: (key: 'team1' | 'team2', idx: number, value: string) => void
  onPlayerBlur: (key: 'team1' | 'team2', idx: number) => void
}) {
  const ring = accent === 'blue' ? 'focus:ring-blue-400' : 'focus:ring-red-400'
  const head = accent === 'blue' ? 'text-blue-700' : 'text-red-600'
  return (
    <div className="card">
      <input
        value={team.name}
        onChange={(e) => onTeamName(teamKey, e.target.value)}
        onBlur={onTeamNameBlur}
        className={`text-lg font-bold ${head} mb-3 w-full border-b border-transparent hover:border-gray-200 focus:border-gray-300 outline-none pb-1`}
      />
      <div className="space-y-1.5">
        {team.players.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-7 text-right text-xs font-bold text-gray-400 shrink-0">{i + 1}</span>
            <input
              value={p}
              onChange={(e) => onPlayerChange(teamKey, i, e.target.value)}
              onBlur={() => onPlayerBlur(teamKey, i)}
              className={`flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 ${ring} focus:border-transparent`}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// ====== 팀별인원 탭 ======
function RosterTab({
  teams,
  onTeamName,
  onTeamNameBlur,
  onPlayerChange,
  onPlayerBlur,
}: {
  teams: Teams
  onTeamName: (key: 'team1' | 'team2', name: string) => void
  onTeamNameBlur: () => void
  onPlayerChange: (key: 'team1' | 'team2', idx: number, value: string) => void
  onPlayerBlur: (key: 'team1' | 'team2', idx: number) => void
}) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-3">
        이름을 바꾸면 그 사람이 포함된 <b>모든 경기</b>에 자동으로 반영됩니다. (사람 교체 시 여기서 수정)
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TeamRosterGrid
          teamKey="team1"
          team={teams.team1}
          accent="blue"
          onTeamName={onTeamName}
          onTeamNameBlur={onTeamNameBlur}
          onPlayerChange={onPlayerChange}
          onPlayerBlur={onPlayerBlur}
        />
        <TeamRosterGrid
          teamKey="team2"
          team={teams.team2}
          accent="red"
          onTeamName={onTeamName}
          onTeamNameBlur={onTeamNameBlur}
          onPlayerChange={onPlayerChange}
          onPlayerBlur={onPlayerBlur}
        />
      </div>
    </div>
  )
}

// ====== 대진표수정 탭 ======
function BracketTab({
  games,
  teams,
  conflicts,
  onUpdateGame,
}: {
  games: TournamentGame[]
  teams: Teams
  conflicts: Set<number>
  onUpdateGame: (idx: number, mutate: (g: TournamentGame) => TournamentGame) => void
}) {
  const allOpts = useMemo(() => [...teams.team1.players, ...teams.team2.players], [teams])

  return (
    <div className="card overflow-x-auto">
      <p className="text-xs text-gray-500 mb-3">
        각 경기의 선수·심판을 팀 명단에서 선택해 수정합니다. 빨간 행은 같은 시간대 충돌입니다.
      </p>
      <table className="w-full border-collapse min-w-[440px] text-sm">
        <thead>
          <tr className="bg-gray-50 text-xs text-gray-500">
            <th className="px-1 py-2 border-b text-center w-9">경기</th>
            <th className="px-0.5 py-2 border-b text-center text-blue-600" colSpan={2}>청팀</th>
            <th className="px-0.5 py-2 border-b text-center text-red-600" colSpan={2}>백팀</th>
            <th className="px-0.5 py-2 border-b text-center">심판</th>
          </tr>
        </thead>
        <tbody>
          {games.map((g, i) => {
            const bad = conflicts.has(i)
            return (
              <tr key={g.id} className={bad ? 'bg-red-50' : 'hover:bg-gray-50'}>
                <td className="px-1 py-1 border-b text-center font-bold text-gray-500 text-xs">
                  {i + 1}
                  {bad && <AlertTriangle size={10} className="inline text-red-500" />}
                </td>
                <td className="px-0.5 py-1 border-b">
                  <PlayerSelect value={g.team1[0]} options={teams.team1.players}
                    onChange={(v) => onUpdateGame(i, (x) => ({ ...x, team1: [v, x.team1[1]] }))} />
                </td>
                <td className="px-0.5 py-1 border-b">
                  <PlayerSelect value={g.team1[1]} options={teams.team1.players}
                    onChange={(v) => onUpdateGame(i, (x) => ({ ...x, team1: [x.team1[0], v] }))} />
                </td>
                <td className="px-0.5 py-1 border-b">
                  <PlayerSelect value={g.team2[0]} options={teams.team2.players}
                    onChange={(v) => onUpdateGame(i, (x) => ({ ...x, team2: [v, x.team2[1]] }))} />
                </td>
                <td className="px-0.5 py-1 border-b">
                  <PlayerSelect value={g.team2[1]} options={teams.team2.players}
                    onChange={(v) => onUpdateGame(i, (x) => ({ ...x, team2: [x.team2[0], v] }))} />
                </td>
                <td className="px-0.5 py-1 border-b">
                  <PlayerSelect value={g.referee} options={allOpts}
                    onChange={(v) => onUpdateGame(i, (x) => ({ ...x, referee: v }))} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
