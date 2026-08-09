import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// 计算某周的时间范围（周一到周日）
function getWeekRange(week: number, year: number): { start: Date; end: Date } {
  const startDate = new Date(process.env.SEMESTER_START_DATE || '2026-03-02')
  const startDateThisYear = new Date(year, startDate.getMonth(), startDate.getDate())

  // 调整到当周的周一
  const startDayOfWeek = startDateThisYear.getDay()
  const daysToMonday = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1
  const startWeekMonday = new Date(startDateThisYear)
  startWeekMonday.setDate(startWeekMonday.getDate() - daysToMonday)

  // 计算目标周的开始日期（周一）
  const weekStartMonday = new Date(startWeekMonday)
  weekStartMonday.setDate(weekStartMonday.getDate() + (week - 1) * 7)

  // 该周结束日期（周日晚上）
  const weekEndSunday = new Date(weekStartMonday)
  weekEndSunday.setDate(weekEndSunday.getDate() + 6)
  weekEndSunday.setHours(23, 59, 59, 999)

  return { start: weekStartMonday, end: weekEndSunday }
}

// 计算某周的截止时间（本周日23:59:59.999）
function getWeekDeadline(week: number, year: number): Date {
  const startDate = new Date(process.env.SEMESTER_START_DATE || '2026-03-02')
  const startDateThisYear = new Date(year, startDate.getMonth(), startDate.getDate())

  // 调整到当周的周一
  const startDayOfWeek = startDateThisYear.getDay()
  const daysToMonday = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1
  const startWeekMonday = new Date(startDateThisYear)
  startWeekMonday.setDate(startWeekMonday.getDate() - daysToMonday)

  // 计算目标周的下周一（截止时间），并设置为23:59:59.999
  const deadline = new Date(startWeekMonday)
  deadline.setDate(deadline.getDate() + (week - 1) * 7 + 7)  // 下周一 = 周一 + 7天
  deadline.setHours(23, 59, 59, 999)

  return deadline
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const week = searchParams.get('week')
    const year = searchParams.get('year')

    if (!week || !year) {
      return NextResponse.json(
        { error: '缺少周次或年份参数' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // 获取该周所有报告
    const { data: reports, error } = await supabase
      .from('weekly_reports')
      .select(`
        *,
        student:students!inner (
          name,
          student_id,
          squad,
          advisor
        )
      `)
      .eq('week_number', parseInt(week))
      .eq('year', parseInt(year))
      .order('submitted_at', { ascending: false })

    if (error) {
      throw error
    }

    // 计算截止时间
    const deadline = getWeekDeadline(parseInt(week), parseInt(year))

    // 筛选晚交的记录
    const lateReports = (reports || []).filter((report: any) => {
      const submittedAt = new Date(report.submitted_at)
      return submittedAt.getTime() > deadline.getTime()
    })

    // 按区队分组
    const squad1Late = lateReports.filter((r: any) => r.student.squad === '一区队')
    const squad2Late = lateReports.filter((r: any) => r.student.squad === '二区队')

    return NextResponse.json({
      lateReports,
      squad1Late,
      squad2Late,
      total: lateReports.length,
      squad1Count: squad1Late.length,
      squad2Count: squad2Late.length,
      deadline: deadline.toISOString()
    })
  } catch (error) {
    console.error('获取晚交名单失败:', error)
    return NextResponse.json(
      { error: '获取晚交名单失败' },
      { status: 500 }
    )
  }
}
