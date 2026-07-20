import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { studentId, weekNumber, year, contacted_professor, professor_replied, reply_details } = body

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

    // 插入新的周报记录
    const { data, error } = await supabase
      .from('weekly_reports')
      .insert({
        student_id: studentId,
        week_number: weekNumber,
        year: year,
        contacted_professor,
        professor_replied: contacted_professor ? professor_replied : null,
        reply_details: contacted_professor ? reply_details : null,
      })
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
    })
  } catch (error) {
    console.error('提交错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
