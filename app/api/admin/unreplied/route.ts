import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { getCurrentWeek } from '@/lib/utils'

interface UnrepliedCase {
  student: {
    id: string
    name: string
    student_id: string
    squad: string
    advisor: string
  }
  currentWeek: number
  currentYear: number
  previousWeek: number
  previousYear: number
  // 本周的联系发起方
  contact_initiator?: 'student' | 'teacher' | null
  // 上周的联系发起方
  previous_contact_initiator?: 'student' | 'teacher' | null
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const week = searchParams.get('week')
    const year = searchParams.get('year')

    // 计算要检测的周次（默认为当前周和上一周）
    const currentWeekData = getCurrentWeek()
    const currentWeekNumber = week ? parseInt(week) : currentWeekData.weekNumber
    const currentYearNumber = year ? parseInt(year) : currentWeekData.year

    // 计算上一周
    let previousWeekNumber = currentWeekNumber - 1
    let previousYearNumber = currentYearNumber
    if (previousWeekNumber < 1) {
      previousWeekNumber = 52
      previousYearNumber = currentYearNumber - 1
    }

    const supabase = createServiceClient()

    // 获取当前周的周报（学生咨询过但导师未回复）
    const { data: currentWeekReports, error: currentError } = await supabase
      .from('weekly_reports')
      .select('*, student:students(id, name, student_id, squad, advisor)')
      .eq('week_number', currentWeekNumber)
      .eq('year', currentYearNumber)
      .eq('contacted_professor', true)
      .eq('professor_replied', false)

    if (currentError) throw currentError

    // 获取上一周的周报（学生咨询过但导师未回复）
    const { data: previousWeekReports, error: previousError } = await supabase
      .from('weekly_reports')
      .select('student_id, contact_initiator')
      .eq('week_number', previousWeekNumber)
      .eq('year', previousYearNumber)
      .eq('contacted_professor', true)
      .eq('professor_replied', false)

    if (previousError) throw previousError

    // 找出连续两周都未回复的学生
    const previousWeekStudentIds = new Set(
      previousWeekReports?.map((r) => r.student_id) || []
    )
    const previousWeekInitiatorMap = new Map(
      (previousWeekReports || []).map((r) => [r.student_id, r.contact_initiator])
    )

    const unrepliedCases: UnrepliedCase[] = (currentWeekReports || [])
      .filter((report) => previousWeekStudentIds.has(report.student_id))
      .map((report) => ({
        student: (report as any).student,
        currentWeek: currentWeekNumber,
        currentYear: currentYearNumber,
        previousWeek: previousWeekNumber,
        previousYear: previousYearNumber,
        contact_initiator: (report as any).contact_initiator || null,
        previous_contact_initiator: previousWeekInitiatorMap.get(report.student_id) || null,
      }))

    return NextResponse.json({
      cases: unrepliedCases,
      summary: {
        total: unrepliedCases.length,
        currentWeek: currentWeekNumber,
        currentYear: currentYearNumber,
        previousWeek: previousWeekNumber,
        previousYear: previousYearNumber,
      },
    })
  } catch (error) {
    console.error('检测未回复情况失败:', error)
    return NextResponse.json({ error: '检测失败' }, { status: 500 })
  }
}
