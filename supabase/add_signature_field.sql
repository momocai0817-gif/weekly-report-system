-- 添加 signature 字段到 weekly_reports 表
-- 在 Supabase SQL Editor 中执行此脚本

DO $$
BEGIN
  -- 检查字段是否已存在
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'weekly_reports'
    AND column_name = 'signature'
  ) THEN
    -- 添加 signature 字段
    ALTER TABLE weekly_reports ADD COLUMN signature TEXT;
    RAISE NOTICE 'signature 字段已添加';
  ELSE
    RAISE NOTICE 'signature 字段已存在';
  END IF;

  -- 删除旧的 screenshot_urls 字段（如果存在）
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'weekly_reports'
    AND column_name = 'screenshot_urls'
  ) THEN
    ALTER TABLE weekly_reports DROP COLUMN screenshot_urls;
    RAISE NOTICE '旧的 screenshot_urls 字段已删除';
  END IF;
END $$;

-- 验证字段已添加
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'weekly_reports'
ORDER BY ordinal_position;
