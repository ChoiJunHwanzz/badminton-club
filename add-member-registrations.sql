-- ========================================
-- 가입절차 테이블 추가
-- Supabase SQL Editor에서 실행하세요
-- ========================================

-- 가입절차 테이블
-- 회원별 가입 관련 추가 정보 관리
CREATE TABLE member_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE UNIQUE,
  introduction BOOLEAN DEFAULT FALSE,   -- 자기소개 완료 여부
  fee_paid BOOLEAN DEFAULT FALSE,       -- 회비 납부 여부
  is_rejoin BOOLEAN DEFAULT FALSE,      -- 재가입 여부
  note TEXT,                            -- 비고
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_member_registrations_member_id ON member_registrations(member_id);

-- updated_at 자동 갱신 트리거
CREATE TRIGGER member_registrations_updated_at BEFORE UPDATE ON member_registrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS 비활성화
ALTER TABLE member_registrations DISABLE ROW LEVEL SECURITY;
