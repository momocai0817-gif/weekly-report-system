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

    // 获取所有学生
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, name, student_id, squad, advisor')
      .order('squad', { ascending: true })
      .order('student_id', { ascending: true })

    if (studentsError) {
      throw studentsError
    }

    // 获取本周已提交的学生ID
    const { data: reports, error: reportsError } = await supabase
      .from('weekly_reports')
      .select('student_id')
      .eq('week_number', parseInt(week))
      .eq('year', parseInt(year))

    if (reportsError) {
      throw reportsError
    }

    const submittedStudentIds = new Set(reports.map(r => r.student_id))

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
