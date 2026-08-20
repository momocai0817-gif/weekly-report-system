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
      .select(`
        id,
        student_id,
        week_number,
        year,
        needs_refill,
        refill_requested_at,
        refill_reason,
        refill_resolved_at,
        refill_resolved_note,
        submitted_at,
        contacted_professor,
        contact_initiator,
        professor_replied,
        preparation_work,
        question_list,
        advisor_feedback,
        not_contacted_reason,
        signature,
        student:students!inner (
          name,
          student_id,
          squad,
          advisor
        )
      `)
      .eq('needs_refill', true)
      .order('refill_requested_at', { ascending: false })

    if (weekParam) query = query.eq('week_number', parseInt(weekParam))
    if (yearParam) query = query.eq('year', parseInt(yearParam))

    const { data: reports, error } = await query

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
      filtered = filtered.filter(r => !r.refill_resolved_at)
    }

    return NextResponse.json({
      reports: filtered,
      summary: {
        total: filtered.length,
        active: filtered.filter(r => !r.refill_resolved_at).length,
        resolved: filtered.filter(r => r.refill_resolved_at).length,
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