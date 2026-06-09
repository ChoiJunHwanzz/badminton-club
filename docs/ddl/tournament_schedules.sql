-- 대회 시간표/대진 테이블
-- 담당자가 편집하는 대회 1건 = 1 row. games(JSONB)의 배열 순서가 코트/라운드를 결정.
-- 공유용 페이지는 share_token으로 조회하며 Realtime 구독으로 실시간 반영된다.
-- ※ Supabase SQL Editor에서 1회 실행하세요.

CREATE TABLE IF NOT EXISTS tournament_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(100) NOT NULL DEFAULT '뚝딱 체육대회',
  event_date DATE,
  share_token VARCHAR(64) NOT NULL UNIQUE,   -- 공유 URL 토큰 (변조 방지용 비밀값)
  court_count INTEGER NOT NULL DEFAULT 4,
  games JSONB NOT NULL DEFAULT '[]',          -- 경기 배열 (순서 = 코트/라운드)
  blocks JSONB NOT NULL DEFAULT '[]',         -- 교시 시간표(개회/미니게임/시상 포함)
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, completed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tournament_schedules_token ON tournament_schedules(share_token);

-- updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_tournament_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_tournament_schedules_updated_at ON tournament_schedules;
CREATE TRIGGER trigger_tournament_schedules_updated_at
BEFORE UPDATE ON tournament_schedules
FOR EACH ROW EXECUTE FUNCTION update_tournament_schedules_updated_at();

-- RLS 비활성화 (다른 테이블과 동일, 개인 프로젝트)
ALTER TABLE tournament_schedules DISABLE ROW LEVEL SECURITY;

-- ✅ Realtime 활성화 (공유 페이지 실시간 반영에 필수)
-- 이미 추가돼 있으면 에러가 날 수 있는데, 그 경우 무시하면 됩니다.
ALTER PUBLICATION supabase_realtime ADD TABLE tournament_schedules;
