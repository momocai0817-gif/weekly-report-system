-- 备份并删除程馨源本周的周报记录
-- 请在 Supabase SQL Editor 中执行此脚本

-- 第一步：查看程馨源当前的所有周报记录
SELECT
  wr.id,
  s.name,
  s.student_id,
  wr.week_number,
  wr.year,
  wr.submitted_at,
  wr.contacted_professor,
  wr.professor_replied,
  wr.preparation_work,
  wr.question_list,
  wr.advisor_feedback,
  wr.follow_up_plan
FROM weekly_reports wr
JOIN students s ON wr.student_id = s.id
WHERE s.name = '程馨源'
ORDER BY wr.submitted_at DESC;

-- 第二步：备份记录到归档表
-- 注意：请根据实际情况修改week_number为当前周数
INSERT INTO weekly_reports_archive (
  id,
  student_id,
  week_number,
  year,
  contacted_professor,
  professor_replied,
  reply_details,
  not_contacted_reason,
  preparation_work,
  question_list,
  advisor_feedback,
  follow_up_plan,
  signature,
  submitted_at,
  archived_at,
  archive_reason
)
SELECT
  wr.*,
  NOW() as archived_at,
  '程馨源本周记录删除前的备份' as archive_reason
FROM weekly_reports wr
JOIN students s ON wr.student_id = s.id
WHERE s.name = '程馨源'
  AND wr.week_number = X  -- 替换X为实际的当前周数
  AND wr.year = 2026;     -- 替换为实际年份

-- 第三步：确认备份成功后，删除原记录
-- 注意：请先确认上面的INSERT操作成功，再执行此DELETE
-- DELETE FROM weekly_reports
-- WHERE id IN (
--   SELECT wr.id
--   FROM weekly_reports wr
--   JOIN students s ON wr.student_id = s.id
--   WHERE s.name = '程馨源'
--     AND wr.week_number = X  -- 替换X为实际的当前周数
--     AND wr.year = 2026      -- 替换为实际年份
-- );

-- 第四步：验证删除结果
SELECT
  s.name,
  s.student_id,
  COUNT(wr.id) as report_count
FROM students s
LEFT JOIN weekly_reports wr ON s.id = wr.student_id
WHERE s.name = '程馨源'
GROUP BY s.name, s.student_id;

-- 第五步：查看归档表中的备份记录
SELECT
  archive.id,
  s.name,
  s.student_id,
  archive.week_number,
  archive.year,
  archive.submitted_at,
  archive.archived_at,
  archive.archive_reason
FROM weekly_reports_archive archive
JOIN students s ON archive.student_id = s.id
WHERE s.name = '程馨源'
  AND archive.archive_reason = '程馨源本周记录删除前的备份'
ORDER BY archive.archived_at DESC;
