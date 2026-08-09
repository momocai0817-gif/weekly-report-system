import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// 计算周次
function getWeekNumber(monday: Date): { weekNumber: number; year: number } {
  const startDate = new Date(process.env.SEMESTER_START_DATE || '2026-02-23')
  const year = monday.getFullYear()
  const startDateThisYear = new Date(year, startDate.getMonth(), startDate.getDate())

  const startDayOfWeek = startDateThisYear.getDay()
  const daysToMonday = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1
  const startWeekMonday = new Date(startDateThisYear)
  startWeekMonday.setDate(startWeekMonday.getDate() - daysToMonday)

  const actualStartWeekMonday = monday < startWeekMonday
    ? new Date(year - 1, startWeekMonday.getMonth(), startWeekMonday.getDate())
    : startWeekMonday

  const diffTime = monday.getTime() - actualStartWeekMonday.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  const weekNumber = Math.floor(diffDays / 7) + 1

  return { weekNumber, year }
}

// 计算某周的周一
function getWeekMonday(weekNumber: number, year: number): Date {
  const startDate = new Date(process.env.SEMESTER_START_DATE || '2026-02-23')
  const startDateThisYear = new Date(year, startDate.getMonth(), startDate.getDate())

  const startDayOfWeek = startDateThisYear.getDay()
  const daysToMonday = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1
  const startWeekMonday = new Date(startDateThisYear)
  startWeekMonday.setDate(startWeekMonday.getDate() - daysToMonday)

  const weekMonday = new Date(startWeekMonday)
  weekMonday.setDate(weekMonday.getDate() + (weekNumber - 1) * 7)

  return weekMonday
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

    // 从第24周开始，逐周检查截止时间
    // 找到第一个截止时间在当前时间之后的周
    let targetWeekNumber = 24
    let targetYear = now.getFullYear()
    let found = false
    let isLate = false
    let previousWeekHasSubmitted = false

    // 最多检查10周
    for (let i = 0; i < 10; i++) {
      const weekNum = targetWeekNumber + i
      const weekMonday = getWeekMonday(weekNum, targetYear)

      // 计算该周的截止时间（下周一23:59）
      const weekDeadline = new Date(weekMonday)
      weekDeadline.setDate(weekDeadline.getDate() + 7)
      weekDeadline.setHours(23, 59, 59, 999)

      if (now.getTime() <= weekDeadline.getTime()) {
        // 找到了！当前时间在这个周的截止时间之前
        targetWeekNumber = weekNum
        found = true

        // 检查前一周是否已提交（如果是第24周，则没有前一周，或者前一周已结束）
        if (weekNum > 24) {
          const prevWeekNum = weekNum - 1
          const { data: prevWeekReport } = await supabase
            .from('weekly_reports')
            .select('id')
            .eq('student_id', studentId)
            .eq('week_number', prevWeekNum)
            .eq('year', targetYear)
            .single()

          // 如果前一周没提交，当前提交算晚交
          if (!prevWeekReport) {
            targetWeekNumber = prevWeekNum
            isLate = true
          } else {
            // 前一周已提交，检查本周是否已提交
            const { data: currentWeekReport } = await supabase
              .from('weekly_reports')
              .select('id')
              .eq('student_id', studentId)
              .eq('week_number', weekNum)
              .eq('year', targetYear)
              .single()

            if (currentWeekReport) {
              // 本周已提交，跳到下一周
              targetWeekNumber = weekNum + 1
            }
          }
        }
        break
      }
    }

    if (!found) {
      return NextResponse.json(
        { error: '无法确定提交周次' },
        { status: 400 }
      )
    }

    const targetWeek = { weekNumber: targetWeekNumber, year: targetYear }

    // 检查该周是否已存在报告，如果存在则删除后重新插入（覆盖）
    const { data: existing } = await supabase
      .from('weekly_reports')
      .select('id')
      .eq('student_id', studentId)
      .eq('week_number', targetWeek.weekNumber)
      .eq('year', targetWeek.year)
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
      week_number: targetWeek.weekNumber,
      year: targetWeek.year,
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
      targetWeek: targetWeek,
      isLate: isLate,
    })
  } catch (error) {
    console.error('提交错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
