-- 添加结构化字段到 weekly_reports 表
-- 用于支持更详细的咨询记录，确保学生有充分的准备工作

-- 1. 添加咨询主题字段
ALTER TABLE weekly_reports
ADD COLUMN IF NOT EXISTS consultation_topic TEXT;

-- 2. 添加准备工作字段
ALTER TABLE weekly_reports
ADD COLUMN IF NOT EXISTS preparation_work TEXT;

-- 3. 添加问题清单字段
ALTER TABLE weekly_reports
ADD COLUMN IF NOT EXISTS question_list TEXT;

-- 4. 添加导师反馈字段
ALTER TABLE weekly_reports
ADD COLUMN IF NOT EXISTS advisor_feedback TEXT;

-- 5. 添加后续计划字段
ALTER TABLE weekly_reports
ADD COLUMN IF NOT EXISTS follow_up_plan TEXT;

SELECT '结构化字段添加完成！' as status;
