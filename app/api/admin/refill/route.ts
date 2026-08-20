import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// POST: 标记学生需要重填
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { reportId, reason } = body

    if (!reportId) {
      return NextResponse.json(
        { error: '缺少报告ID' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // 检查报告是否存在
    const { data: existing, error: fetchError } = await supabase
      .from('weekly_reports')
      .select('id, student_id, week_number, year, needs_refill, refill_resolved_at')
      .eq('id', reportId)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: '报告不存在' },
        { status: 404 }
      )
    }

    // 标记需要重填
    const updateData: any = {
      needs_refill: true,
      refill_requested_at: new Date().toISOString(),
      refill_reason: reason || null,
      // 重置之前的状态（若已重填过又被打回）
      refill_resolved_at: null,
      refill_resolved_note: null,
    }

    const { data: updated, error: updateError } = await supabase
      .from('weekly_reports')
      .update(updateData)
      .eq('id', reportId)
      .select('*, student:students(name, student_id, squad, advisor)')
      .single()

    if (updateError) {
      // 兼容未迁移字段的情况
      if (updateError.message && updateError.message.includes('needs_refill')) {
        return NextResponse.json(
          { error: '数据库尚未启用重填功能，请先执行迁移脚本 supabase/migrations/add_contact_initiator_and_refill.sql' },
          { status: 500 }
        )
      }
      console.error('标记重填错误:', updateError)
      return NextResponse.json(
        { error: '标记失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      report: updated,
      message: '已通知该学生重新填写周报',
    })
  } catch (error) {
    console.error('标记重填错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}

// DELETE: 撤销重填标记
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: '缺少报告ID' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    const { error } = await supabase
      .from('weekly_reports')
      .update({
        needs_refill: false,
        refill_requested_at: null,
        refill_reason: null,
      })
      .eq('id', id)

    if (error) {
      console.error('撤销重填错误:', error)
      return NextResponse.json(
        { error: '撤销失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('撤销重填错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}