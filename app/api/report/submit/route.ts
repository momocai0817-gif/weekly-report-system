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
      refill_note,
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
      .select('id, needs_refill, refill_resolved_at')
      .eq('student_id', studentId)
      .eq('week_number', currentWeek.weekNumber)
      .eq('year', currentWeek.year)
      .maybeSingle()

    // 判断是否处于重填状态（学委已标记需要重填，且学生尚未完成重填）
    const isRefillSubmission =
      existing &&
      existing.needs_refill === true &&
      !existing.refill_resolved_at

    if (existing) {
      await supabase
        .from('weekly_reports')
        .delete()
        .eq('id', existing.id)
    }

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
      follow_up_plan: null,
      // 重填管理：若学生正在响应重填请求，则标记完成
      needs_refill: isRefillSubmission ? false : false,
      refill_resolved_at: isRefillSubmission ? new Date().toISOString() : null,
      refill_resolved_note: isRefillSubmission ? (refill_note || null) : null,
    }

    if (not_contacted_reason !== undefined) {
      insertData.not_contacted_reason = !contacted_professor ? not_contacted_reason : null
    }

    let { data, error } = await supabase
      .from('weekly_reports')
      .insert(insertData)
      .select()
      .single()

    if (error && error.message && error.message.includes('not_contacted_reason')) {
      // 重试不带该字段
      const { not_contacted_reason: _, ...insertDataRetry } = insertData
      const result = await supabase
        .from('weekly_reports')
        .insert(insertDataRetry)
        .select()
        .single()
      data = result.data
      error = result.error
    }

    if (error && error.message && (
      error.message.includes('contact_initiator') ||
      error.message.includes('needs_refill')
    )) {
      // 兼容未应用新字段迁移的旧库
      const { not_contacted_reason: _, contact_initiator: _ci, needs_refill: _nr,
              refill_resolved_at: _ra, refill_resolved_note: _rn, ...insertDataRetry } = insertData
      const result = await supabase
        .from('weekly_reports')
        .insert(insertDataRetry)
        .select()
        .single()
      data = result.data
      error = result.error
    }

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
      is_refill_submission: isRefillSubmission,
    })
  } catch (error) {
    console.error('提交错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}