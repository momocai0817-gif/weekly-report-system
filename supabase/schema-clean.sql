-- 论文导师周报系统 - 自建 PostgreSQL 干净版 schema
-- 由 init.sql + migrations 合并，去掉 Supabase 专属函数和 RLS

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. 学生表
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  student_id TEXT UNIQUE NOT NULL,
  squad TEXT NOT NULL CHECK (squad IN ('一区队', '二区队')),
  advisor TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 周报表（含所有结构化字段）
CREATE TABLE IF NOT EXISTS weekly_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL CHECK (week_number > 0),
  year INTEGER NOT NULL CHECK (year >= 2020),
  contacted_professor BOOLEAN NOT NULL,
  professor_replied BOOLEAN,
  reply_details TEXT,
  not_contacted_reason TEXT,
  signature TEXT,
  consultation_topic TEXT,
  preparation_work TEXT,
  question_list TEXT,
  advisor_feedback TEXT,
  follow_up_plan TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, week_number, year)
);

-- 3. 管理员表（保留兼容，但登录用 env 变量不走这张表）
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 周归档表
CREATE TABLE IF NOT EXISTS weekly_archives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_number INTEGER NOT NULL CHECK (week_number > 0),
  year INTEGER NOT NULL CHECK (year >= 2020),
  unsubmitted_file_url TEXT,
  submitted_file_url TEXT,
  signatures_file_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(week_number, year)
);

-- 5. 索引
CREATE INDEX IF NOT EXISTS idx_reports_student_week ON weekly_reports(student_id, week_number, year);
CREATE INDEX IF NOT EXISTS idx_reports_week ON weekly_reports(week_number, year);
CREATE INDEX IF NOT EXISTS idx_students_squad ON students(squad);
CREATE INDEX IF NOT EXISTS idx_weekly_archives_week_year ON weekly_archives(week_number, year);
CREATE INDEX IF NOT EXISTS idx_weekly_archives_created_at ON weekly_archives(created_at DESC);

-- 6. 视图：本周提交情况统计
CREATE OR REPLACE VIEW weekly_submission_stats AS
SELECT
  s.squad,
  s.advisor,
  COUNT(DISTINCT s.id) as total_students,
  COUNT(DISTINCT wr.student_id) as submitted_students,
  COUNT(DISTINCT s.id) - COUNT(DISTINCT wr.student_id) as unsubmitted_students
FROM students s
LEFT JOIN weekly_reports wr ON s.id = wr.student_id
  AND wr.week_number = EXTRACT(WEEK FROM CURRENT_TIMESTAMP)
  AND wr.year = EXTRACT(YEAR FROM CURRENT_TIMESTAMP)
GROUP BY s.squad, s.advisor
ORDER BY s.squad, s.advisor;

-- 7. 视图：未提交学生列表
CREATE OR REPLACE VIEW unsubmitted_students_view AS
SELECT
  s.id,
  s.name,
  s.student_id,
  s.squad,
  s.advisor
FROM students s
WHERE NOT EXISTS (
  SELECT 1 FROM weekly_reports wr
  WHERE wr.student_id = s.id
    AND wr.week_number = EXTRACT(WEEK FROM CURRENT_TIMESTAMP)
    AND wr.year = EXTRACT(YEAR FROM CURRENT_TIMESTAMP)
)
ORDER BY s.squad, s.student_id;

-- 授权
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO weekly;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO weekly;
GRANT ALL PRIVILEGES ON ALL VIEWS IN SCHEMA public TO weekly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO weekly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO weekly;

SELECT 'schema ok' as status;
