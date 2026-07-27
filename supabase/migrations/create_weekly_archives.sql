-- 创建每周归档表
-- 用于存储每周的归档文件URL（未交名单、已交名单、签名ZIP）

-- 启用 UUID 扩展（如果尚未启用）
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 创建 weekly_archives 表
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'weekly_archives') THEN
    CREATE TABLE weekly_archives (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      week_number INTEGER NOT NULL CHECK (week_number > 0),
      year INTEGER NOT NULL CHECK (year >= 2020),
      unsubmitted_file_url TEXT,
      submitted_file_url TEXT,
      signatures_file_url TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(week_number, year)
    );

    -- 添加索引以提高查询性能
    CREATE INDEX idx_weekly_archives_week_year ON weekly_archives(week_number, year);
    CREATE INDEX idx_weekly_archives_created_at ON weekly_archives(created_at DESC);

    RAISE NOTICE 'weekly_archives 表已创建';
  ELSE
    RAISE NOTICE 'weekly_archives 表已存在，跳过';
  END IF;
END $$;

-- 添加注释
COMMENT ON TABLE weekly_archives IS '每周归档记录表，存储归档文件的下载链接';
COMMENT ON COLUMN weekly_archives.week_number IS '周次';
COMMENT ON COLUMN weekly_archives.year IS '年份';
COMMENT ON COLUMN weekly_archives.unsubmitted_file_url IS '未交名单文件URL（Excel格式）';
COMMENT ON COLUMN weekly_archives.submitted_file_url IS '已交名单文件URL（Excel格式）';
COMMENT ON COLUMN weekly_archives.signatures_file_url IS '签名文件URL（ZIP格式）';
COMMENT ON COLUMN weekly_archives.created_at IS '归档创建时间';
