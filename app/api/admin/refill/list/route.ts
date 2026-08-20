import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// GET: 列出所有需要重填的学生（包含本周和历史）
// query 参数：active=true 仅返回尚未完成重填的；week / year 按周次筛选
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const activeOnly = searchParams.get('active') === 'true'
    const weekParam = searchParams.get('week')
    const yearParam = searchParams.get('year')

    const supabase = createServiceClient()

    let query = supabase
      .from('weekly_reports')
      .select('*')
      .eq('needs_refill', true)

    if (weekParam) query = query.eq('week_number', parseInt(weekParam))
    if (yearParam) query = query.eq('year', parseInt(yearParam))

    const ordered = (query as any).order
      ? query.order('refill_requested_at', { ascending: false })
      : query

    const { data: reports, error } = await ordered

    if (error) {
      console.error('查询重填列表错误:', error)
      if (error.message && error.message.includes('needs_refill')) {
        return NextResponse.json(
          { error: '数据库尚未启用重填功能，请先执行迁移脚本 supabase/migrations/add_contact_initiator_and_refill.sql' },
          { status: 500 }
        )
      }
      return NextResponse.json(
        { error: '查询失败' },
        { status: 500 }
      )
    }

    let filtered = reports || []
    if (activeOnly) {
      filtered = filtered.filter((r: any) => !r.refill_resolved_at)
    }

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
        active: enriched.filter((r: any) => !r.refill_resolved_at).length,
        resolved: enriched.filter((r: any) => r.refill_resolved_at).length,
      },
    })
  } catch (error) {
    console.error('查询重填列表错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}