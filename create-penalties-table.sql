-- 당일취소/지각 관리 테이블
CREATE TABLE penalties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('cancel', 'late')),
  date DATE NOT NULL,
  after_4pm BOOLEAN DEFAULT false,
  fine_paid BOOLEAN DEFAULT false,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_penalties_member_id ON penalties(member_id);
CREATE INDEX idx_penalties_type ON penalties(type);
CREATE INDEX idx_penalties_date ON penalties(date);

-- updated_at 자동 갱신 트리거
CREATE TRIGGER penalties_updated_at BEFORE UPDATE ON penalties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
