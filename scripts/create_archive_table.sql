-- 创建周报归档表（如果不存在）
-- 请在 Supabase SQL Editor 中执行此脚本

-- 检查归档表是否存在，如果不存在则创建
CREATE TABLE IF NOT EXISTS weekly_reports_archive (
  id UUID PRIMARY KEY,
  student_id UUID NOT NULL,
  week_number INTEGER NOT NULL CHECK (week_number > 0),
  year INTEGER NOT NULL CHECK (year >= 2020),
  contacted_professor BOOLEAN NOT NULL,
  professor_replied BOOLEAN,
  reply_details TEXT,
  not_contacted_reason TEXT,
  preparation_work TEXT,
  question_list TEXT,
  advisor_feedback TEXT,
  follow_up_plan TEXT,
  signature TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL,
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  archive_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_archive_student ON weekly_reports_archive(student_id);
CREATE INDEX IF NOT EXISTS idx_archive_week ON weekly_reports_archive(week_number, year);
CREATE INDEX IF NOT EXISTS idx_archive_archived_at ON weekly_reports_archive(archived_at);

-- 添加注释
COMMENT ON TABLE weekly_reports_archive IS '周报归档表，用于备份已删除或移动的周报记录';
COMMENT ON COLUMN weekly_reports_archive.archived_at IS '归档时间';
COMMENT ON COLUMN weekly_reports_archive.archive_reason IS '归档原因';

SELECT '归档表创建完成！' as status;
