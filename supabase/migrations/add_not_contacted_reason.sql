-- 添加未咨询原因字段
-- 用于存储第一题选择"否"时填写的原因或现处阶段

ALTER TABLE weekly_reports ADD COLUMN IF NOT EXISTS not_contacted_reason TEXT;

-- 完成
SELECT 'not_contacted_reason 字段已添加' as status;
