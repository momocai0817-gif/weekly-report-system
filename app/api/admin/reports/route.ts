import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// 计算某周的截止时间（周一23:59）
function getWeekDeadline(week: number, year: number): Date {
  const startDate = new Date(process.env.SEMESTER_START_DATE || '2025-02-24')
  const startOfYear = new Date(year, 0, 1)
  const startDateThisYear = new Date(year, startDate.getMonth(), startDate.getDate())

  // 调整到当周的周一
  const startDayOfWeek = startDateThisYear.getDay()
  const daysToMonday = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1
  const startWeekMonday = new Date(startDateThisYear)
  startWeekMonday.setDate(startWeekMonday.getDate() - daysToMonday)

  // 计算目标周的开始日期（周一）
  const weekStartMonday = new Date(startWeekMonday)
  weekStartMonday.setDate(weekStartMonday.getDate() + (week - 1) * 7)

  // 截止时间是周一23:59
  const deadline = new Date(weekStartMonday)
  deadline.setDate(deadline.getDate() + 1) // 周一
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

    // 计算该周的截止时间
    const deadline = getWeekDeadline(parseInt(week), parseInt(year))

    // 标记晚交的记录
    const reportsWithLateStatus = (reports || []).map((report: any) => {
      const submittedAt = new Date(report.submitted_at)
      const isLate = submittedAt.getTime() > deadline.getTime()
      return {
        ...report,
        is_late: isLate
      }
    })

    return NextResponse.json({ reports: reportsWithLateStatus }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error) {
    console.error('获取周报失败:', error)
    return NextResponse.json(
      { error: '获取周报失败' },
      { status: 500 }
    )
  }
}
