// 대회 시간표/대진 기본 데이터 및 헬퍼
// 표시 순서(index)가 코트/라운드/타임슬롯을 결정한다. (id = 매치업 고유 식별자)

export type GameStatus = 'scheduled' | 'playing' | 'done'
export type GameWinner = 'team1' | 'team2' | null

export interface TournamentGame {
  id: number
  tier: [number, number]
  team1: [string, string]
  team2: [string, string]
  referee: string
  status?: GameStatus // 미지정 = 'scheduled'(대기)
  winner?: GameWinner // status==='done'일 때만 의미
}

export type BlockKind = 'opening' | 'play' | 'mini' | 'award'

export interface TimetableBlock {
  kind: BlockKind
  start: string
  end: string
  label: string
  rounds?: number[]
}

export const DEFAULT_TITLE = '뚝딱 체육대회'
export const DEFAULT_COURT_COUNT = 4
export const GAMES_PER_ROUND = 8

export const DEFAULT_GAMES: TournamentGame[] = [
  { id: 3, tier: [1, 14], team1: ['허현규', '김지안'], team2: ['방성준', '김소희'], referee: '하동균' },
  { id: 6, tier: [10, 13], team1: ['우성민', '박지은'], team2: ['조병훈', '전소연'], referee: '이현호' },
  { id: 11, tier: [8, 12], team1: ['강민수', '방주영'], team2: ['정성훈', '오희빈'], referee: '최대한' },
  { id: 12, tier: [7, 11], team1: ['구교선', '남재현'], team2: ['노경택', '한재영'], referee: '정현준' },
  { id: 29, tier: [1, 4], team1: ['허현규', '하동균'], team2: ['방성준', '차현욱'], referee: '구교선' },
  { id: 32, tier: [5, 9], team1: ['이광현', '이상빈'], team2: ['김동휘', '최대한'], referee: '노경택' },
  { id: 42, tier: [2, 15], team1: ['이준호', '정효주'], team2: ['김지석', '이예은'], referee: '강민수' },
  { id: 43, tier: [3, 6], team1: ['최준환', '이현호'], team2: ['김용진', '정현준'], referee: '정성훈' },
  { id: 10, tier: [4, 11], team1: ['하동균', '남재현'], team2: ['차현욱', '한재영'], referee: '이현호' },
  { id: 13, tier: [2, 5], team1: ['이준호', '이상빈'], team2: ['김지석', '최대한'], referee: '강민수' },
  { id: 14, tier: [10, 15], team1: ['우성민', '정효주'], team2: ['조병훈', '이예은'], referee: '정현준' },
  { id: 21, tier: [3, 7], team1: ['최준환', '구교선'], team2: ['김용진', '노경택'], referee: '정성훈' },
  { id: 22, tier: [12, 13], team1: ['방주영', '박지은'], team2: ['오희빈', '전소연'], referee: '우성민' },
  { id: 23, tier: [1, 6], team1: ['허현규', '이현호'], team2: ['방성준', '정현준'], referee: '이상빈' },
  { id: 25, tier: [9, 14], team1: ['이광현', '김지안'], team2: ['김동휘', '김소희'], referee: '최대한' },
  { id: 35, tier: [4, 8], team1: ['하동균', '강민수'], team2: ['차현욱', '정성훈'], referee: '노경택' },
  { id: 18, tier: [2, 4], team1: ['이준호', '하동균'], team2: ['김지석', '차현욱'], referee: '이현호' },
  { id: 20, tier: [10, 11], team1: ['우성민', '남재현'], team2: ['조병훈', '한재영'], referee: '구교선' },
  { id: 28, tier: [8, 9], team1: ['강민수', '이광현'], team2: ['정성훈', '김동휘'], referee: '정현준' },
  { id: 30, tier: [5, 14], team1: ['이상빈', '김지안'], team2: ['최대한', '김소희'], referee: '노경택' },
  { id: 31, tier: [1, 3], team1: ['허현규', '최준환'], team2: ['방성준', '김용진'], referee: '하동균' },
  { id: 34, tier: [2, 12], team1: ['이준호', '방주영'], team2: ['김지석', '오희빈'], referee: '정성훈' },
  { id: 37, tier: [6, 15], team1: ['이현호', '정효주'], team2: ['정현준', '이예은'], referee: '최대한' },
  { id: 41, tier: [7, 13], team1: ['구교선', '박지은'], team2: ['노경택', '전소연'], referee: '강민수' },
  { id: 2, tier: [3, 13], team1: ['최준환', '박지은'], team2: ['김용진', '전소연'], referee: '구교선' },
  { id: 15, tier: [12, 14], team1: ['방주영', '김지안'], team2: ['오희빈', '김소희'], referee: '최대한' },
  { id: 27, tier: [2, 6], team1: ['이준호', '이현호'], team2: ['김지석', '정현준'], referee: '정성훈' },
  { id: 36, tier: [9, 10], team1: ['이광현', '우성민'], team2: ['김동휘', '조병훈'], referee: '하동균' },
  { id: 38, tier: [1, 11], team1: ['허현규', '남재현'], team2: ['방성준', '한재영'], referee: '이현호' },
  { id: 40, tier: [3, 5], team1: ['최준환', '이상빈'], team2: ['김용진', '최대한'], referee: '정현준' },
  { id: 45, tier: [7, 8], team1: ['구교선', '강민수'], team2: ['노경택', '정성훈'], referee: '우성민' },
  { id: 48, tier: [4, 15], team1: ['하동균', '정효주'], team2: ['차현욱', '이예은'], referee: '오희빈' },
  { id: 4, tier: [11, 15], team1: ['정효주', '남재현'], team2: ['이예은', '한재영'], referee: '허현규' },
  { id: 5, tier: [5, 12], team1: ['이상빈', '방주영'], team2: ['최대한', '오희빈'], referee: '우성민' },
  { id: 17, tier: [7, 9], team1: ['구교선', '이광현'], team2: ['노경택', '김동휘'], referee: '이현호' },
  { id: 19, tier: [8, 14], team1: ['강민수', '김지안'], team2: ['정성훈', '김소희'], referee: '정현준' },
  { id: 33, tier: [6, 13], team1: ['이현호', '박지은'], team2: ['정현준', '전소연'], referee: '구교선' },
  { id: 39, tier: [1, 5], team1: ['허현규', '이상빈'], team2: ['방성준', '최대한'], referee: '노경택' },
  { id: 44, tier: [4, 10], team1: ['하동균', '조병훈'], team2: ['차현욱', '우성민'], referee: '정성훈' },
  { id: 47, tier: [2, 3], team1: ['이준호', '최준환'], team2: ['김지석', '김용진'], referee: '강민수' },
  { id: 1, tier: [5, 6], team1: ['이상빈', '이현호'], team2: ['최대한', '정현준'], referee: '노경택' },
  { id: 7, tier: [3, 4], team1: ['최준환', '하동균'], team2: ['김용진', '차현욱'], referee: '구교선' },
  { id: 8, tier: [1, 2], team1: ['허현규', '이준호'], team2: ['방성준', '김지석'], referee: '강민수' },
  { id: 9, tier: [11, 13], team1: ['남재현', '박지은'], team2: ['한재영', '전소연'], referee: '정성훈' },
  { id: 16, tier: [6, 7], team1: ['이현호', '구교선'], team2: ['정현준', '노경택'], referee: '최대한' },
  { id: 24, tier: [8, 10], team1: ['강민수', '우성민'], team2: ['정성훈', '조병훈'], referee: '이상빈' },
  { id: 26, tier: [14, 15], team1: ['김지안', '정효주'], team2: ['김소희', '이예은'], referee: '하동균' },
  { id: 46, tier: [9, 12], team1: ['이광현', '방주영'], team2: ['김동휘', '오희빈'], referee: '김용진' },
]

export const DEFAULT_BLOCKS: TimetableBlock[] = [
  { kind: 'opening', start: '13:00', end: '13:10', label: '개회식 (인사 및 설명)' },
  { kind: 'play', start: '13:10', end: '14:10', label: '라운드 1·2', rounds: [1, 2] },
  { kind: 'mini', start: '14:10', end: '14:20', label: '미니게임 ① 서브 명사수' },
  { kind: 'play', start: '14:20', end: '15:20', label: '라운드 3·4', rounds: [3, 4] },
  { kind: 'mini', start: '15:20', end: '15:40', label: '미니게임 ② 김지석을 이겨라 · ③ 셔틀콕 볼링' },
  { kind: 'play', start: '15:40', end: '16:40', label: '라운드 5·6', rounds: [5, 6] },
  { kind: 'award', start: '16:40', end: '', label: '경품 추첨 및 시상' },
]

// 위치(index) → 코트/타임슬롯/라운드
export function positionInfo(index: number, courtCount: number = DEFAULT_COURT_COUNT) {
  const court = (index % courtCount) + 1
  const timeslot = Math.floor(index / courtCount)
  const round = Math.floor(index / (courtCount * 2)) + 1
  return { court, timeslot, round }
}

// 블록별 시작 시각(분). 4타임슬롯(=2라운드)씩 한 블록.
const PLAY_BASE_MIN = [13 * 60 + 10, 14 * 60 + 20, 15 * 60 + 40]

function fmt(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0')
}

// 타임슬롯(0~11) → 시작/종료 시각 (경기당 15분)
export function slotTime(timeslot: number): { start: string; end: string } {
  const block = Math.min(Math.floor(timeslot / 4), PLAY_BASE_MIN.length - 1)
  const start = PLAY_BASE_MIN[block] + (timeslot % 4) * 15
  return { start: fmt(start), end: fmt(start + 15) }
}

// 같은 타임슬롯 내 선수 중복 / 심판이 선수로 출전 → 충돌 index 집합
export function computeConflicts(
  games: TournamentGame[],
  courtCount: number = DEFAULT_COURT_COUNT
): Set<number> {
  const conflicts = new Set<number>()
  const slots = new Map<number, number[]>()
  games.forEach((_, i) => {
    const ts = Math.floor(i / courtCount)
    if (!slots.has(ts)) slots.set(ts, [])
    slots.get(ts)!.push(i)
  })
  slots.forEach((idxs) => {
    const playerToGames = new Map<string, number[]>()
    idxs.forEach((i) => {
      const g = games[i]
      ;[...g.team1, ...g.team2].forEach((p) => {
        if (!playerToGames.has(p)) playerToGames.set(p, [])
        playerToGames.get(p)!.push(i)
      })
    })
    playerToGames.forEach((arr) => {
      if (arr.length > 1) arr.forEach((i) => conflicts.add(i))
    })
    const playersInSlot = new Set<string>()
    idxs.forEach((i) => [...games[i].team1, ...games[i].team2].forEach((p) => playersInSlot.add(p)))
    idxs.forEach((i) => {
      if (playersInSlot.has(games[i].referee)) conflicts.add(i)
    })
  })
  return conflicts
}

// 배열 내 from→to 이동(자유 재배치)
export function moveGame(games: TournamentGame[], from: number, to: number): TournamentGame[] {
  if (from === to || from < 0 || to < 0 || from >= games.length || to >= games.length) return games
  const next = games.slice()
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

// 랜덤 공유 토큰
export function genShareToken(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().replace(/-/g, '')
  }
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
}

// ===== 팀(마스터 명단) =====
export interface Team {
  name: string
  players: string[]
}
export interface Teams {
  team1: Team // 청팀(team1)
  team2: Team // 백팀(team2)
}

// 현재 games로부터 2팀 명단을 추출(마이그레이션용).
// 각 선수를 다수 출전한 쪽(청/백) 팀에 배정, 등장 순서대로 정렬.
export function deriveTeamsFromGames(games: TournamentGame[]): Teams {
  const c1 = new Map<string, number>()
  const c2 = new Map<string, number>()
  const order1: string[] = []
  const order2: string[] = []
  const seen1 = new Set<string>()
  const seen2 = new Set<string>()
  games.forEach((g) => {
    g.team1.forEach((p) => {
      c1.set(p, (c1.get(p) ?? 0) + 1)
      if (!seen1.has(p)) {
        seen1.add(p)
        order1.push(p)
      }
    })
    g.team2.forEach((p) => {
      c2.set(p, (c2.get(p) ?? 0) + 1)
      if (!seen2.has(p)) {
        seen2.add(p)
        order2.push(p)
      }
    })
  })
  const team1 = order1.filter((p) => (c1.get(p) ?? 0) >= (c2.get(p) ?? 0))
  const team2 = order2.filter((p) => (c2.get(p) ?? 0) > (c1.get(p) ?? 0))
  return {
    team1: { name: '청팀', players: team1 },
    team2: { name: '백팀', players: team2 },
  }
}

export const DEFAULT_TEAMS: Teams = deriveTeamsFromGames(DEFAULT_GAMES)

// 선수 이름 일괄 교체(팀 명단에서 사람이 바뀌면 모든 경기에 전파)
export function renamePlayerInGames(
  games: TournamentGame[],
  oldName: string,
  newName: string
): TournamentGame[] {
  if (!oldName || !newName || oldName === newName) return games
  const swap = (n: string) => (n === oldName ? newName : n)
  return games.map((g) => ({
    ...g,
    team1: [swap(g.team1[0]), swap(g.team1[1])] as [string, string],
    team2: [swap(g.team2[0]), swap(g.team2[1])] as [string, string],
    referee: swap(g.referee),
  }))
}

// 모든 선수(청팀+백팀) 목록
export function allPlayers(teams: Teams): string[] {
  return [...teams.team1.players, ...teams.team2.players]
}
