-- 将郑君涵的本周周报移动到第26周
-- 请在 Supabase SQL Editor 中执行此脚本

-- 1. 查看郑君涵当前的周报记录
SELECT
  wr.id,
  s.name,
  s.student_id,
  wr.week_number,
  wr.year,
  wr.submitted_at,
  wr.contacted_professor,
  wr.professor_replied
FROM weekly_reports wr
JOIN students s ON wr.student_id = s.id
WHERE s.name = '郑君涵'
ORDER BY wr.submitted_at DESC;

-- 2. 将郑君涵当前周（本周）的记录移动到第26周
-- 注意：请先运行上面的查询，确认当前的week_number和year
-- 然后根据实际情况修改下面的条件

-- 假设当前是第X周，需要先查看实际数据后确认
-- UPDATE weekly_reports
-- SET week_number = 26
-- WHERE student_id IN (
--   SELECT id FROM students WHERE name = '郑君涵'
-- )
-- AND week_number = X  -- 替换X为实际当前周数
-- AND year = 2026;      -- 替换为实际年份

-- 3. 验证修改结果
SELECT
  wr.id,
  s.name,
  s.student_id,
  wr.week_number,
  wr.year,
  wr.submitted_at,
  wr.contacted_professor,
  wr.professor_replied
FROM weekly_reports wr
JOIN students s ON wr.student_id = s.id
WHERE s.name = '郑君涵'
ORDER BY wr.submitted_at DESC;
