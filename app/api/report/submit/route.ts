import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { studentId, weekNumber, year, contacted_professor, professor_replied, reply_details, signature, not_contacted_reason } = body

    if (!studentId || weekNumber === undefined || !year) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // 检查是否已存在本周报告
    const { data: existing } = await supabase
      .from('weekly_reports')
      .select('*')
      .eq('student_id', studentId)
      .eq('week_number', weekNumber)
      .eq('year', year)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: '本周已提交周报，如需修改请使用更新功能' },
        { status: 409 }
      )
    }

    // 构建插入数据对象
    const insertData: any = {
      student_id: studentId,
      week_number: weekNumber,
      year: year,
      contacted_professor,
      professor_replied: contacted_professor ? professor_replied : null,
      reply_details: contacted_professor ? reply_details : null,
      signature: signature || null,
    }

    // 添加 not_contacted_reason 字段（向后兼容）
    if (not_contacted_reason !== undefined) {
      insertData.not_contacted_reason = !contacted_professor ? not_contacted_reason : null
    }

    // 先尝试插入
    let { data, error } = await supabase
      .from('weekly_reports')
      .insert(insertData)
      .select()
      .single()

    // 如果错误是因为 not_contacted_reason 字段不存在，则重试不包含该字段
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
    })
  } catch (error) {
    console.error('提交错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
