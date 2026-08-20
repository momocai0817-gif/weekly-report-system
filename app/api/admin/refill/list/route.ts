import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient()

    const searchParams = request.nextUrl.searchParams
    const weekParam = searchParams.get('week')
    const yearParam = searchParams.get('year')

    // 只列出已重填的报告（refill_resolved_at 非空）
    const { data: reports, error } = await supabase
      .from('weekly_reports')
      .select('*')
      .order('refill_resolved_at', { ascending: false })

    if (error) {
      console.error('查询重填列表错误:', error)
      return NextResponse.json({ error: '查询失败' }, { status: 500 })
    }

    // Node 端过滤已重填 + 可选周次/年份
    let filtered = (reports || []).filter((r: any) => !!r.refill_resolved_at)
    if (weekParam) filtered = filtered.filter((r: any) => r.week_number === parseInt(weekParam))
    if (yearParam) filtered = filtered.filter((r: any) => r.year === parseInt(yearParam))

    // 关联学生信息（pg 版不支持嵌套 join，在 Node 端拼接）
    const studentIds = Array.from(new Set(filtered.map((r: any) => r.student_id)))
    const studentMap = new Map<string, any>()
    if (studentIds.length > 0) {
      const { data: students } = await supabase
        .from('students')
        .select('id, name, student_id, squad, advisor')
        .in('id', studentIds as string[])
      ;(students || []).forEach((s: any) => {
        studentMap.set(s.id, s)
      })
    }

    const enriched = filtered.map((r: any) => ({
      ...r,
      student: studentMap.get(r.student_id) || null,
    }))

    return NextResponse.json({
      reports: enriched,
      summary: {
        total: enriched.length,
      },
    })
  } catch (error) {
    console.error('查询重填列表错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
