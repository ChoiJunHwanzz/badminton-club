-- ========================================
-- 배드민턴 클럽 관리 시스템 DB 스키마 v2
-- Supabase에서 SQL Editor로 실행하세요
-- ========================================

-- 기존 테이블 삭제 (데이터가 있으면 백업 먼저!)
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS attendances CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS meetings CASCADE;
DROP TABLE IF EXISTS members CASCADE;

-- 회원 테이블
-- 역할: leader(모임장), advisor(고문), staff(운영진), member(회원)
-- 실력: rally_x(랠리X), rally_o(랠리O), very_beginner(왕초심), beginner(초심), d_class~a_class(D~A조)
-- 상태: active(활동), left(탈퇴), kicked(강퇴)
CREATE TABLE members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('leader', 'advisor', 'staff', 'member')),
  join_date DATE DEFAULT CURRENT_DATE,
  phone VARCHAR(20),
  email VARCHAR(100),
  level VARCHAR(20) DEFAULT 'beginner' CHECK (level IN ('rally_x', 'rally_o', 'very_beginner', 'beginner', 'd_class', 'c_class', 'b_class', 'a_class')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'left', 'kicked')),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 회비 납입 테이블
CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  payment_month VARCHAR(7) NOT NULL, -- YYYY-MM 형식
  paid_date DATE,
  method VARCHAR(20) CHECK (method IN ('cash', 'transfer', 'card')),
  status VARCHAR(20) DEFAULT 'unpaid' CHECK (status IN ('paid', 'unpaid', 'partial')),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 모임 테이블
CREATE TABLE meetings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_date DATE NOT NULL,
  location VARCHAR(200) NOT NULL,
  start_time TIME,
  end_time TIME,
  court_count INTEGER DEFAULT 1,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 출석 테이블
CREATE TABLE attendances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(meeting_id, member_id)
);

-- 경기(대진표) 테이블
CREATE TABLE matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
  court_number INTEGER NOT NULL,
  round INTEGER NOT NULL,
  team1_player1_id UUID REFERENCES members(id),
  team1_player2_id UUID REFERENCES members(id),
  team2_player1_id UUID REFERENCES members(id),
  team2_player2_id UUID REFERENCES members(id),
  team1_score INTEGER,
  team2_score INTEGER,
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'playing', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_members_status ON members(status);
CREATE INDEX idx_members_role ON members(role);
CREATE INDEX idx_payments_member_id ON payments(member_id);
CREATE INDEX idx_payments_month ON payments(payment_month);
CREATE INDEX idx_attendances_meeting_id ON attendances(meeting_id);
CREATE INDEX idx_attendances_member_id ON attendances(member_id);
CREATE INDEX idx_matches_meeting_id ON matches(meeting_id);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER members_updated_at BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER meetings_updated_at BEFORE UPDATE ON meetings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER matches_updated_at BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Row Level Security (RLS) 비활성화 (개인 프로젝트용)
-- 필요시 활성화하고 정책 추가
ALTER TABLE members DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE meetings DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendances DISABLE ROW LEVEL SECURITY;
ALTER TABLE matches DISABLE ROW LEVEL SECURITY;
