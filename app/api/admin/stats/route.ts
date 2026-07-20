import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

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

    // 获取学生总数和各区队人数
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('squad')

    if (studentsError) {
      throw studentsError
    }

    const squad1Total = students.filter(s => s.squad === '一区队').length
    const squad2Total = students.filter(s => s.squad === '二区队').length

    // 获取本周提交的学生
    const { data: reports, error: reportsError } = await supabase
      .from('weekly_reports')
      .select('student_id')
      .eq('week_number', parseInt(week))
      .eq('year', parseInt(year))

    if (reportsError) {
      throw reportsError
    }

    const submittedStudentIds = new Set(reports.map(r => r.student_id))

    // 获取已提交学生的区队信息
    const { data: submittedStudents, error: submittedError } = await supabase
      .from('students')
      .select('id, squad')
      .in('id', Array.from(submittedStudentIds))

    if (submittedError) {
      throw submittedError
    }

    const squad1Submitted = submittedStudents.filter(s => s.squad === '一区队').length
    const squad2Submitted = submittedStudents.filter(s => s.squad === '二区队').length

    const stats = {
      total: students.length,
      submitted: reports.length,
      unsubmitted: students.length - reports.length,
      squad1Total,
      squad1Submitted,
      squad2Total,
      squad2Submitted,
    }

    return NextResponse.json({ stats })
  } catch (error) {
    console.error('获取统计数据失败:', error)
    return NextResponse.json(
      { error: '获取统计数据失败' },
      { status: 500 }
    )
  }
}
