-- ========================================
-- meetings 테이블 생성
-- 아래 SQL을 하나씩 순서대로 실행하세요
-- ========================================

-- 1. 테이블 생성
CREATE TABLE meetings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_date DATE NOT NULL,
  location VARCHAR(200) NOT NULL,
  start_time TIME,
  end_time TIME,
  attendee_count INTEGER DEFAULT 0,
  staff_attendance JSONB DEFAULT '[]',
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
