import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { getCurrentWeek } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      studentId,
      contacted_professor,
      contact_initiator,
      professor_replied,
      reply_details,
      signature,
      not_contacted_reason,
      preparation_work,
      question_list,
      advisor_feedback,
      isRefill,
    } = body

    if (!studentId) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()
    const now = new Date()

    // 获取当前周次
    const currentWeek = getCurrentWeek(now)

    // 检查该周是否已存在报告
    const { data: existing } = await supabase
      .from('weekly_reports')
      .select('id')
      .eq('student_id', studentId)
      .eq('week_number', currentWeek.weekNumber)
      .eq('year', currentWeek.year)
      .maybeSingle()

    if (existing) {
      await supabase
        .from('weekly_reports')
        .delete()
        .eq('id', existing.id)
    }

    // 是否通过重填通道（?refill=1）进入
    const submitAsRefill = isRefill === true

    // 构建插入数据对象
    const insertData: any = {
      student_id: studentId,
      week_number: currentWeek.weekNumber,
      year: currentWeek.year,
      contacted_professor,
      // 联系发起方：仅在咨询时填写
      contact_initiator: contacted_professor
        ? (contact_initiator === 'teacher' ? 'teacher' : 'student')
        : null,
      professor_replied: contacted_professor ? professor_replied : null,
      reply_details: contacted_professor ? reply_details : null,
      signature: signature || null,
      // 结构化字段
      preparation_work: contacted_professor ? preparation_work : null,
      question_list: contacted_professor ? question_list : null,
      advisor_feedback: (contacted_professor && professor_replied) ? advisor_feedback : null,
      // 历史字段保留为 null
      follow_up_plan: null,
      needs_refill: false,
      refill_requested_at: null,
      refill_reason: null,
      refill_resolved_note: null,
      // 通过重填通道进入时，记录重填时间
      refill_resolved_at: submitAsRefill ? new Date().toISOString() : null,
    }

    if (not_contacted_reason !== undefined) {
      insertData.not_contacted_reason = !contacted_professor ? not_contacted_reason : null
    }

    const { data, error } = await supabase
      .from('weekly_reports')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('插入错误:', error)
      return NextResponse.json(
        { error: '提交失败，请稍后重试' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      report: data,
      targetWeek: { weekNumber: currentWeek.weekNumber, year: currentWeek.year },
      is_refill_submission: submitAsRefill,
    })
  } catch (error) {
    console.error('提交错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
