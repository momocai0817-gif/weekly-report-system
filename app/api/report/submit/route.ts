import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// 根据提交时间计算周次（考虑上周是否已交）
function getTargetWeek(submittedAt: Date, studentId: string, supabase: any): {
  thisWeek: { weekNumber: number; year: number }
  lastWeek: { weekNumber: number; year: number }
} {
  // 先计算当前应该是第几周
  const deadline = process.env.WEEKLY_DEADLINE || 'Monday 23:59'
  const [day, time] = deadline.split(' ')
  const [hour, minute] = time.split(':').map(Number)

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const targetDay = daysOfWeek.indexOf(day)

  const currentDay = submittedAt.getDay()

  // 计算本周的周一
  let daysSinceMonday = currentDay - 1
  if (daysSinceMonday < 0) {
    daysSinceMonday += 7
  }

  const thisMonday = new Date(submittedAt)
  thisMonday.setDate(submittedAt.getDate() - daysSinceMonday)
  thisMonday.setHours(0, 0, 0, 0)

  // 计算上周的周一
  const lastMonday = new Date(thisMonday)
  lastMonday.setDate(lastMonday.getDate() - 7)

  // 计算本周的周次
  const startDate = new Date(process.env.SEMESTER_START_DATE || '2025-02-24')
  const year = thisMonday.getFullYear()
  const startOfYear = new Date(year, 0, 1)
  const startDateThisYear = new Date(year, startDate.getMonth(), startDate.getDate())

  const startDayOfWeek = startDateThisYear.getDay()
  const daysToMonday = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1
  const startWeekMonday = new Date(startDateThisYear)
  startWeekMonday.setDate(startWeekMonday.getDate() - daysToMonday)

  const actualStartWeekMonday = thisMonday < startWeekMonday
    ? new Date(year - 1, startWeekMonday.getMonth(), startWeekMonday.getDate())
    : startWeekMonday

  const diffTime = thisMonday.getTime() - actualStartWeekMonday.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  const thisWeekNumber = Math.floor(diffDays / 7) + 1
  const lastWeekNumber = thisWeekNumber - 1
  const lastWeekYear = lastWeekNumber < 1 ? year - 1 : year

  // 检查上周是否已提交（异步函数中不能直接用await，需要在调用处处理）
  return {
    thisWeek: { weekNumber: thisWeekNumber, year },
    lastWeek: { weekNumber: lastWeekNumber < 1 ? 52 : lastWeekNumber, year: lastWeekNumber < 1 ? year - 1 : year }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { studentId, contacted_professor, professor_replied, reply_details, signature, not_contacted_reason } = body

    if (!studentId) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // 计算本周和上周的周次
    const submittedAt = new Date()
    const weeks = getTargetWeek(submittedAt, studentId, supabase)

    // 检查上周是否已提交
    const { data: lastWeekReport } = await supabase
      .from('weekly_reports')
      .select('id')
      .eq('student_id', studentId)
      .eq('week_number', weeks.lastWeek.weekNumber)
      .eq('year', weeks.lastWeek.year)
      .single()

    // 确定应该提交到哪一周
    let targetWeek, isLate
    if (lastWeekReport) {
      // 上周已交，提交到本周
      targetWeek = weeks.thisWeek
      isLate = false
    } else {
      // 上周没交，提交到上周（晚交）
      targetWeek = weeks.lastWeek
      isLate = true
    }

    // 检查该周是否已存在报告
    const { data: existing } = await supabase
      .from('weekly_reports')
      .select('*')
      .eq('student_id', studentId)
      .eq('week_number', targetWeek.weekNumber)
      .eq('year', targetWeek.year)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: `第${targetWeek.weekNumber}周已提交周报，如需修改请使用更新功能` },
        { status: 409 }
      )
    }

    // 构建插入数据对象
    const insertData: any = {
      student_id: studentId,
      week_number: targetWeek.weekNumber,
      year: targetWeek.year,
      contacted_professor,
      professor_replied: contacted_professor ? professor_replied : null,
      reply_details: contacted_professor ? reply_details : null,
      signature: signature || null,
    }

    // 添加 not_contacted_reason 字段（向后兼容）
    if (not_contacted_reason !== undefined) {
      insertData.not_contacted_reason = !contacted_professor ? not_contacted_reason : null
    }

    // 先尝试插入
    let { data, error } = await supabase
      .from('weekly_reports')
      .insert(insertData)
      .select()
      .single()

    // 如果错误是因为 not_contacted_reason 字段不存在，则重试不包含该字段
    if (error && error.message && error.message.includes('not_contacted_reason')) {
      const { not_contacted_reason: _, ...insertDataRetry } = insertData
      const result = await supabase
        .from('weekly_reports')
        .insert(insertDataRetry)
        .select()
        .single()
      data = result.data
      error = result.error
    }

    if (error) {
      console.error('插入错误:', error)
      return NextResponse.json(
        { error: '提交失败，请稍后重试' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      report: data,
      targetWeek: targetWeek,
      isLate: isLate,
    })
  } catch (error) {
    console.error('提交错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
