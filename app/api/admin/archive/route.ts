import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient()

    // 获取学生总数
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id')

    if (studentsError) {
      throw studentsError
    }

    const totalStudents = students?.length || 0

    // 获取所有周报记录，按周次分组统计
    const { data: reports, error: reportsError } = await supabase
      .from('weekly_reports')
      .select('week_number, year, student_id')

    if (reportsError) {
      throw reportsError
    }

    // 统计每周的提交情况
    const weekMap = new Map<string, Set<string>>()

    reports?.forEach((report) => {
      const key = `${report.year}-${report.week_number}`
      if (!weekMap.has(key)) {
        weekMap.set(key, new Set())
      }
      weekMap.get(key)!.add(report.student_id)
    })

    // 生成汇总数据
    const summaries = Array.from(weekMap.entries())
      .map(([key, studentSet]) => {
        const [year, week] = key.split('-').map(Number)
        const submitted = studentSet.size
        const rate = totalStudents > 0
          ? Math.round((submitted / totalStudents) * 100)
          : 0

        return {
          week,
          year,
          total: totalStudents,
          submitted,
          rate,
        }
      })
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year
        return b.week - a.week
      })

    return NextResponse.json({ summaries })
  } catch (error) {
    console.error('获取归档数据失败:', error)
    return NextResponse.json(
      { error: '获取归档数据失败' },
      { status: 500 }
    )
  }
}
