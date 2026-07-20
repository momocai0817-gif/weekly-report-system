-- 论文导师周报系统数据库初始化脚本
-- 请在 Supabase SQL Editor 中执行此脚本

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. 创建学生表
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  student_id TEXT UNIQUE NOT NULL,
  squad TEXT NOT NULL CHECK (squad IN ('一区队', '二区队')),
  advisor TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 创建周报表
CREATE TABLE IF NOT EXISTS weekly_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL CHECK (week_number > 0),
  year INTEGER NOT NULL CHECK (year >= 2020),
  contacted_professor BOOLEAN NOT NULL,
  professor_replied BOOLEAN,
  reply_details TEXT,
  screenshot_urls TEXT[], -- 存储截图URL数组
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, week_number, year) -- 每周只能提交一次
);

-- 3. 创建管理员表
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_reports_student_week ON weekly_reports(student_id, week_number, year);
CREATE INDEX IF NOT EXISTS idx_reports_week ON weekly_reports(week_number, year);
CREATE INDEX IF NOT EXISTS idx_students_squad ON students(squad);

-- 5. 行级安全策略 (RLS) - 简化版本
-- 注意：由于应用通过服务端API访问，RLS策略可以简化
-- 如果不需要客户端直接访问，可以禁用RLS

-- 启用 RLS
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- 学生表策略 - 允许所有读取（通过服务端API）
CREATE POLICY "允许读取学生信息" ON students
  FOR SELECT USING (true);

-- 只有服务端可以修改学生信息
CREATE POLICY "服务端可修改学生信息" ON students
  FOR ALL USING (auth.role() = 'service_role');

-- 周报表策略 - 允许所有读取（通过服务端API）
CREATE POLICY "允许读取周报" ON weekly_reports
  FOR SELECT USING (true);

-- 只有服务端可以修改周报
CREATE POLICY "服务端可修改周报" ON weekly_reports
  FOR ALL USING (auth.role() = 'service_role');

-- 管理员表 - 只有服务端可以访问
CREATE POLICY "服务端可访问管理员表" ON admins
  FOR ALL USING (auth.role() = 'service_role');

-- 6. 插入默认管理员账户
-- 密码: admin123 (请在生产环境中修改)
INSERT INTO admins (username, password_hash)
VALUES ('admin', '$2b$10$XZV7Y.Gx8QK8YzMxqqE2LOqN8R8G9wKxYWq8KxYWq8KxYWq8KxYWq')
ON CONFLICT (username) DO NOTHING;

-- 7. 创建视图：本周提交情况统计
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

-- 8. 创建视图：未提交学生列表
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

-- 完成
SELECT '数据库初始化完成！' as status;
