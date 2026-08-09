import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// 计算当前是第几周
function getCurrentWeek(now: Date): { weekNumber: number; year: number; monday: Date } {
  const startDate = new Date(process.env.SEMESTER_START_DATE || '2026-02-23')
  const currentDay = now.getDay()
  let daysSinceMonday = currentDay - 1
  if (daysSinceMonday < 0) daysSinceMonday += 7

  const thisMonday = new Date(now)
  thisMonday.setDate(now.getDate() - daysSinceMonday)
  thisMonday.setHours(0, 0, 0, 0)

  const startDayOfWeek = startDate.getDay()
  const daysToMonday = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1
  const startWeekMonday = new Date(startDate)
  startWeekMonday.setDate(startWeekMonday.getDate() - daysToMonday)

  const diffTime = thisMonday.getTime() - startWeekMonday.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  const weekNumber = Math.floor(diffDays / 7) + 1

  return { weekNumber, year: thisMonday.getFullYear(), monday: thisMonday }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { studentId, contacted_professor, professor_replied, reply_details, signature, not_contacted_reason } = body

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
