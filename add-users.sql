-- ========================================
-- 사용자 계정 테이블
-- Supabase SQL Editor에서 실행하세요
-- ========================================

-- updated_at 자동 갱신 함수 (없으면 생성)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 사용자 테이블
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'manager')),
  name VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_users_username ON users(username);

-- updated_at 자동 갱신 트리거
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS 비활성화
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- ========================================
-- 초기 계정 데이터
-- ========================================

INSERT INTO users (username, password, role, name) VALUES
  ('admin', 'jade~!5159', 'admin', '관리자'),
  ('manager', 'wltjr4384@@', 'manager', '운영진');
