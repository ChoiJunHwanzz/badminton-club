-- 대회 관리(팀별 인원) 기능용 컬럼 추가
-- teams: { team1: {name, players[]}, team2: {name, players[]} } 형태의 마스터 명단
-- ※ Supabase SQL Editor에서 1회 실행하세요.

ALTER TABLE tournament_schedules
  ADD COLUMN IF NOT EXISTS teams JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 실행 후, '대회 관리' 메뉴에 처음 들어가면 현재 대진(games)에서
-- 2팀 명단이 자동으로 추출되어 teams에 채워집니다(마이그레이션).
