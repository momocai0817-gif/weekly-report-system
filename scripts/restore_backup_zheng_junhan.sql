-- 从归档表恢复郑君涵的周报记录（如果需要）
-- 请在 Supabase SQL Editor 中执行此脚本

-- 第一步：查看归档表中的备份记录
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
WHERE s.name = '郑君涵'
ORDER BY archive.archived_at DESC;

-- 第二步：从归档表恢复记录到主表
-- 注意：请将下面的归档ID替换为实际的ID
-- INSERT INTO weekly_reports (
--   id,
--   student_id,
--   week_number,
--   year,
--   contacted_professor,
--   professor_replied,
--   reply_details,
--   not_contacted_reason,
--   preparation_work,
--   question_list,
--   advisor_feedback,
--   follow_up_plan,
--   signature,
--   submitted_at
-- )
-- SELECT
--   id,
--   student_id,
--   week_number,
--   year,
--   contacted_professor,
--   professor_replied,
--   reply_details,
--   not_contacted_reason,
--   preparation_work,
--   question_list,
--   advisor_feedback,
--   follow_up_plan,
--   signature,
--   submitted_at
-- FROM weekly_reports_archive
-- WHERE id = '归档记录的ID';  -- 替换为实际的归档记录ID

-- 第三步：验证恢复结果
SELECT
  wr.id,
  s.name,
  s.student_id,
  wr.week_number,
  wr.year,
  wr.submitted_at
FROM weekly_reports wr
JOIN students s ON wr.student_id = s.id
WHERE s.name = '郑君涵'
ORDER BY wr.submitted_at DESC;
