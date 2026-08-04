import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

// 加载环境变量
const envPath = join(process.cwd(), '.env.local')
const envContent = readFileSync(envPath, 'utf-8')
const envVars: Record<string, string> = {}

envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim()
  }
})

// 修复后的 getCurrentWeek 函数
function getCorrectWeek(date: Date): { weekNumber: number; year: number } {
  const deadline = 'Monday 23:59'
  const [day, time] = deadline.split(' ')
  const [hour, minute] = time.split(':').map(Number)

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const targetDay = daysOfWeek.indexOf(day)

  const currentDay = date.getDay()

  // 计算本周截止日期（最近的周一，可能是今天或之前）
  let daysSinceTarget = currentDay - targetDay
  if (daysSinceTarget < 0) {
    daysSinceTarget += 7
  }

  // 计算本周截止日期
  const deadlineDate = new Date(date)
  deadlineDate.setDate(date.getDate() - daysSinceTarget)
  deadlineDate.setHours(hour, minute, 59, 999)

  // 根据是否已过截止时间来确定周报所属的周
  // 截止时间（周一23:59）之前：填写上一周的周报（使用上周一计算周次）
  // 截止时间之后：填写本周的周报（使用本周一计算周次）
  let weekStartMonday: Date
  if (date.getTime() > deadlineDate.getTime()) {
    // 已过截止时间：使用本周一
    weekStartMonday = new Date(date)
    weekStartMonday.setDate(date.getDate() - daysSinceTarget)
  } else {
    // 未过截止时间：使用上周一
    weekStartMonday = new Date(date)
    weekStartMonday.setDate(date.getDate() - daysSinceTarget - 7)
  }

  const startDate = new Date(envVars.SEMESTER_START_DATE || '2025-02-24')
  const year = weekStartMonday.getFullYear()
  const startOfYear = new Date(year, 0, 1)
  const startDateThisYear = new Date(year, startDate.getMonth(), startDate.getDate())

  const actualStartDate = weekStartMonday < startDateThisYear
    ? new Date(year - 1, startDate.getMonth(), startDate.getDate())
    : startDateThisYear

  const diffTime = weekStartMonday.getTime() - actualStartDate.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  const weekNumber = Math.floor(diffDays / 7) + 1

  return { weekNumber, year }
}

async function main() {
  const supabase = createClient(
    envVars.NEXT_PUBLIC_SUPABASE_URL!,
    envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  console.log('开始检查周一提交的周报...\n')

  // 获取昨天（周一）的日期范围
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(0, 0, 0, 0)

  const yesterdayEnd = new Date(yesterday)
  yesterdayEnd.setHours(23, 59, 59, 999)

  console.log(`查询时间范围: ${yesterday.toISOString()} 到 ${yesterdayEnd.toISOString()}`)

  // 查询周一提交的所有记录
  const { data: reports, error } = await supabase
    .from('weekly_reports')
    .select('*')
    .gte('submitted_at', yesterday.toISOString())
    .lte('submitted_at', yesterdayEnd.toISOString())
    .order('submitted_at', { ascending: true })

  if (error) {
    console.error('查询失败:', error)
    return
  }

  console.log(`\n找到 ${reports?.length || 0} 条周一提交的记录\n`)

  if (!reports || reports.length === 0) {
    console.log('没有需要修复的记录')
    return
  }

  let fixedCount = 0

  for (const report of reports) {
    const submittedDate = new Date(report.submitted_at)
    const correctWeek = getCorrectWeek(submittedDate)

    console.log(`--- 记录 ID: ${report.id} ---`)
    console.log(`提交时间: ${submittedDate.toLocaleString('zh-CN')}`)
    console.log(`当前周次: 第 ${report.week_number} 周 (${report.year}年)`)
    console.log(`正确周次: 第 ${correctWeek.weekNumber} 周 (${correctWeek.year}年)`)

    const needsFix = report.week_number !== correctWeek.weekNumber || report.year !== correctWeek.year

    if (needsFix) {
      console.log('⚠️ 周次错误！')

      // 检查是否已有正确周次的记录
      const { data: existing } = await supabase
        .from('weekly_reports')
        .select('*')
        .eq('student_id', report.student_id)
        .eq('week_number', correctWeek.weekNumber)
        .eq('year', correctWeek.year)
        .single()

      if (existing) {
        console.log(`   学生在第 ${correctWeek.weekNumber} 周已有记录，删除错误记录...`)

        // 删除错误周次的记录
        const { error: deleteError } = await supabase
          .from('weekly_reports')
          .delete()
          .eq('id', report.id)

        if (deleteError) {
          console.error('❌ 删除失败:', deleteError)
        } else {
          console.log('✅ 已删除错误记录！')
          fixedCount++
        }
      } else {
        console.log('   正确周次无记录，尝试修改...')

        // 修改周次
        const { error: updateError } = await supabase
          .from('weekly_reports')
          .update({
            week_number: correctWeek.weekNumber,
            year: correctWeek.year
          })
          .eq('id', report.id)

        if (updateError) {
          console.error('❌ 修改失败:', updateError)
        } else {
          console.log('✅ 修改成功！')
          fixedCount++
        }
      }
    } else {
      console.log('✓ 周次正确，无需修复')
    }

    console.log()
  }

  console.log(`\n修复完成！共修复 ${fixedCount} 条记录`)
}

main().catch(console.error)
