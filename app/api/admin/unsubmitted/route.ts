import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// 检查当前是否在截止时间之前（周一23:59之前）
function isBeforeDeadline(): boolean {
  const deadline = process.env.WEEKLY_DEADLINE || 'Monday 23:59'
  const [day, time] = deadline.split(' ')
  const [hour, minute] = time.split(':').map(Number)

  const now = new Date()
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const targetDay = daysOfWeek.indexOf(day)

  const currentDay = now.getDay()
  const daysUntilTarget = (targetDay - currentDay + 7) % 7

  const deadlineDate = new Date(now)
  deadlineDate.setDate(now.getDate() + daysUntilTarget)
  deadlineDate.setHours(hour, minute, 0, 0)

  if (now > deadlineDate && daysUntilTarget !== 0) {
    deadlineDate.setDate(deadlineDate.getDate() - 7)
  }

  return now < deadlineDate
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

    // 获取所有学生
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, name, student_id, squad, advisor')
      .order('squad', { ascending: true })
      .order('student_id', { ascending: true })

    if (studentsError) {
      throw studentsError
    }

    // 获取已提交的学生ID
    const { data: weekReports } = await supabase
      .from('weekly_reports')
      .select('student_id')
      .eq('week_number', parseInt(week))
      .eq('year', parseInt(year))

    // 如果当前在截止时间之前（周一23:59之前），需要同时查询下一周数据
    let nextWeekReports: any[] | null = null
    if (isBeforeDeadline()) {
      let nextWeek = parseInt(week) + 1
      let nextYear = parseInt(year)
      if (nextWeek > 52) {
        nextWeek = 1
        nextYear = parseInt(year) + 1
      }

      const { data: nextWeekData } = await supabase
        .from('weekly_reports')
        .select('student_id')
        .eq('week_number', nextWeek)
        .eq('year', nextYear)

      nextWeekReports = nextWeekData || []
    }

    // 合并去重
    const submittedStudentIds = new Set()
    ;(weekReports || []).forEach((r: any) => submittedStudentIds.add(r.student_id))
    if (nextWeekReports) {
      nextWeekReports.forEach((r: any) => submittedStudentIds.add(r.student_id))
    }

    // 筛选出未提交的学生
    const unsubmittedStudents = students.filter(
      student => !submittedStudentIds.has(student.id)
    )

    return NextResponse.json({
      students: unsubmittedStudents,
    })
  } catch (error) {
    console.error('获取未交名单失败:', error)
    return NextResponse.json(
      { error: '获取未交名单失败' },
      { status: 500 }
    )
  }
}
