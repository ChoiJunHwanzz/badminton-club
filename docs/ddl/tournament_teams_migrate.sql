-- 대회 관리(팀별 인원) 마이그레이션
-- 하드코딩 기본 대진(DEFAULT_GAMES)에서 추출한 2팀 명단을 teams 컬럼에 채운다.
-- ※ Supabase SQL Editor에서 1회 실행.

-- 1) 컬럼 추가(없으면)
ALTER TABLE tournament_schedules
  ADD COLUMN IF NOT EXISTS teams JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 2) 명단 마이그레이션 (아직 비어있는 행만 — 이미 편집한 데이터는 보존)
UPDATE tournament_schedules
   SET teams = '{"team1": {"name": "청팀", "players": ["허현규", "김지안", "우성민", "박지은", "강민수", "방주영", "구교선", "남재현", "하동균", "이광현", "이상빈", "이준호", "정효주", "최준환", "이현호"]}, "team2": {"name": "백팀", "players": ["방성준", "김소희", "조병훈", "전소연", "정성훈", "오희빈", "노경택", "한재영", "차현욱", "김동휘", "최대한", "김지석", "이예은", "김용진", "정현준"]}}'::jsonb
 WHERE teams IS NULL OR teams = '{}'::jsonb;
