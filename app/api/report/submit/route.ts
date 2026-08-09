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

// 计算当前是第几周
function getCurrentWeek(now: Date): { weekNumber: number; year: number; monday: Date } {
  const currentDay = now.getDay()
  let daysSinceMonday = currentDay - 1
  if (daysSinceMonday < 0) daysSinceMonday += 7

  const thisMonday = new Date(now)
  thisMonday.setDate(now.getDate() - daysSinceMonday)
  thisMonday.setHours(0, 0, 0, 0)

  const weekInfo = getWeekNumber(thisMonday)
  return { ...weekInfo, monday: thisMonday }
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

    // 计算当前周的截止时间（下周一23:59）
    const currentWeekMonday = currentWeek.monday
    const currentWeekDeadline = new Date(currentWeekMonday)
    currentWeekDeadline.setDate(currentWeekDeadline.getDate() + 7)
    currentWeekDeadline.setHours(23, 59, 59, 999)

    // 计算下一周的截止时间（下下周一23:59）
    const nextWeekMonday = new Date(currentWeekMonday)
    nextWeekMonday.setDate(nextWeekMonday.getDate() + 7)
    const nextWeekDeadline = new Date(nextWeekMonday)
    nextWeekDeadline.setDate(nextWeekDeadline.getDate() + 7)
    nextWeekDeadline.setHours(23, 59, 59, 999)

    let targetWeek, isLate

    // 判断应该提交到哪一周
    if (now.getTime() <= currentWeekDeadline.getTime()) {
      // 在当前周截止时间之前 → 提交到当前周（正常）
      targetWeek = currentWeek
      isLate = false
    } else if (now.getTime() <= nextWeekDeadline.getTime()) {
      // 在当前周截止时间之后，但在下一周截止时间之前
      // 检查该学生在当前周是否已提交
      const { data: currentWeekReport } = await supabase
        .from('weekly_reports')
        .select('id')
        .eq('student_id', studentId)
        .eq('week_number', currentWeek.weekNumber)
        .eq('year', currentWeek.year)
        .single()

      if (currentWeekReport) {
        // 当前周已提交 → 提交到下一周（正常）
        targetWeek = { weekNumber: currentWeek.weekNumber + 1, year: currentWeek.year, monday: nextWeekMonday }
        isLate = false
      } else {
        // 当前周未提交 → 提交到当前周（晚交）
        targetWeek = currentWeek
        isLate = true
      }
    } else {
      // 在下一周截止时间之后 → 检查是否下一周已提交
      const nextWeekNumber = currentWeek.weekNumber + 1
      const { data: nextWeekReport } = await supabase
        .from('weekly_reports')
        .select('id')
        .eq('student_id', studentId)
        .eq('week_number', nextWeekNumber)
        .eq('year', currentWeek.year)
        .single()

      if (nextWeekReport) {
        // 下一周已提交，无法重复提交
        return NextResponse.json(
          { error: `第${nextWeekNumber}周已提交周报，如需修改请重新提交` },
          { status: 409 }
        )
      }

      targetWeek = { weekNumber: nextWeekNumber, year: currentWeek.year, monday: nextWeekMonday }
      isLate = true
    }

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
      targetWeek: { weekNumber: targetWeek.weekNumber, year: targetWeek.year },
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
