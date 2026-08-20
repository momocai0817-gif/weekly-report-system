-- 添加"联系发起方"字段 + 重填管理相关字段
-- 用于：
--   1. 区分"我主动联系老师"和"老师主动联系我"两种情况
--   2. 支持学委向导师核实后，标记学生需要重新填写周报

-- 1. 联系发起方
ALTER TABLE weekly_reports
ADD COLUMN IF NOT EXISTS contact_initiator TEXT
  CHECK (contact_initiator IS NULL OR contact_initiator IN ('student', 'teacher'));

COMMENT ON COLUMN weekly_reports.contact_initiator IS
  '联系发起方：student=学生主动联系老师，teacher=老师主动联系学生；未咨询时为 NULL';

-- 2. 是否需要重填（学委标记）
ALTER TABLE weekly_reports
ADD COLUMN IF NOT EXISTS needs_refill BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN weekly_reports.needs_refill IS '是否被学委标记需要重新填写';

-- 3. 重填请求时间
ALTER TABLE weekly_reports
ADD COLUMN IF NOT EXISTS refill_requested_at TIMESTAMP WITH TIME ZONE;

-- 4. 重填原因
ALTER TABLE weekly_reports
ADD COLUMN IF NOT EXISTS refill_reason TEXT;

COMMENT ON COLUMN weekly_reports.refill_reason IS '学委要求学生重新填写的原因';

-- 5. 重填完成时间（学生重新提交后填入）
ALTER TABLE weekly_reports
ADD COLUMN IF NOT EXISTS refill_resolved_at TIMESTAMP WITH TIME ZONE;

-- 6. 学生重新提交时的备注（可选）
ALTER TABLE weekly_reports
ADD COLUMN IF NOT EXISTS refill_resolved_note TEXT;

-- 7. 索引：加快按 needs_refill 查询
CREATE INDEX IF NOT EXISTS idx_reports_needs_refill
  ON weekly_reports(needs_refill)
  WHERE needs_refill = TRUE;

-- 完成
SELECT '联系发起方 + 重填管理字段已添加' as status;