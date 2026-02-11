-- 대진표 세션 테이블
-- 일자별 대진표 데이터를 저장

CREATE TABLE match_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_date DATE NOT NULL,
  court_count INTEGER NOT NULL DEFAULT 2,
  attendees JSONB NOT NULL DEFAULT '[]',  -- 참석자 배열 (순위, 지각 정보 포함)
  matches JSONB NOT NULL DEFAULT '[]',     -- 생성된 매치 배열
  current_round INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, completed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 일자별 유니크 (하루에 하나의 활성 세션만)
CREATE UNIQUE INDEX idx_match_sessions_date_active
ON match_sessions (session_date)
WHERE status = 'active';

-- 업데이트 트리거
CREATE OR REPLACE FUNCTION update_match_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_match_sessions_updated_at
BEFORE UPDATE ON match_sessions
FOR EACH ROW EXECUTE FUNCTION update_match_sessions_updated_at();
