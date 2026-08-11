import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { getCurrentWeek } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      studentId,
      contacted_professor,
      professor_replied,
      reply_details,
      signature,
      not_contacted_reason,
      preparation_work,
      question_list,
      advisor_feedback,
      follow_up_plan
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

    // 检查该周是否已存在报告，如果存在则删除后重新插入（覆盖）
    const { data: existing } = await supabase
      .from('weekly_reports')
      .select('id')
      .eq('student_id', studentId)
      .eq('week_number', currentWeek.weekNumber)
      .eq('year', currentWeek.year)
      .single()

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
      professor_replied: contacted_professor ? professor_replied : null,
      reply_details: contacted_professor ? reply_details : null,
      signature: signature || null,
      // 结构化字段
      preparation_work: (contacted_professor && professor_replied) ? preparation_work : null,
      question_list: (contacted_professor && professor_replied) ? question_list : null,
      advisor_feedback: (contacted_professor && professor_replied) ? advisor_feedback : null,
      follow_up_plan: (contacted_professor && professor_replied) ? follow_up_plan : null,
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
      const { not_contacted_reason: _, ...insertDataRetry } = insertData
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
    })
  } catch (error) {
    console.error('提交错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
