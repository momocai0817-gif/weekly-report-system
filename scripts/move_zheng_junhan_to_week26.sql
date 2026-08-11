-- 将郑君涵的周报记录移动到第26周
-- 请在 Supabase SQL Editor 中执行此脚本

-- 第一步：查看郑君涵当前的所有周报记录
SELECT
  wr.id,
  s.name,
  s.student_id,
  wr.week_number,
  wr.year,
  wr.submitted_at,
  wr.contacted_professor,
  wr.preparation_work,
  wr.question_list
FROM weekly_reports wr
JOIN students s ON wr.student_id = s.id
WHERE s.name = '郑君涵'
ORDER BY wr.submitted_at DESC;

-- 第二步：根据上面的查询结果，确认要移动的记录ID
-- 然后执行UPDATE语句（请将下面的记录ID替换为实际的ID）
-- UPDATE weekly_reports
-- SET week_number = 26
-- WHERE id = '要移动的记录ID';  -- 替换为实际的记录ID

-- 第三步：验证修改结果
SELECT
  wr.id,
  s.name,
  s.student_id,
  wr.week_number,
  wr.year,
  wr.submitted_at
FROM weekly_reports wr
JOIN students s ON wr.student_id = s.id
WHERE s.name = '郑君涵' AND wr.week_number = 26
ORDER BY wr.submitted_at DESC;
