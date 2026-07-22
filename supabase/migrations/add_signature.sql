-- 添加签名字段到周报表
-- 如果字段已存在则跳过

DO $$
BEGIN
  -- 检查字段是否存在，如果不存在则添加
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'weekly_reports'
    AND column_name = 'signature'
  ) THEN
    ALTER TABLE weekly_reports ADD COLUMN signature TEXT;

    -- 删除旧的 screenshot_urls 字段（如果存在）
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'weekly_reports'
      AND column_name = 'screenshot_urls'
    ) THEN
      ALTER TABLE weekly_reports DROP COLUMN screenshot_urls;
    END IF;

    RAISE NOTICE 'signature 字段已添加，screenshot_urls 字段已删除';
  ELSE
    RAISE NOTICE 'signature 字段已存在，跳过';
  END IF;
END $$;

-- 更新 init.sql 中的表结构（供参考）
-- 新的表结构应该是：
-- CREATE TABLE weekly_reports (
--   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--   student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
--   week_number INTEGER NOT NULL CHECK (week_number > 0),
--   year INTEGER NOT NULL CHECK (year >= 2020),
--   contacted_professor BOOLEAN NOT NULL,
--   professor_replied BOOLEAN,
--   reply_details TEXT,
--   signature TEXT,
--   submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--   UNIQUE(student_id, week_number, year)
-- );
