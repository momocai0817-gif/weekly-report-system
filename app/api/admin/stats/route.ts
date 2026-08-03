import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { getCurrentWeek } from '@/lib/utils'

// 检查当前是否在截止时间之前（周一23:59之前）
function isBeforeDeadline(): boolean {
  const deadline = process.env.WEEKLY_DEADLINE || 'Monday 23:59'
  const [day, time] = deadline.split(' ')
  const [hour, minute] = time.split(':').map(Number)

  const now = new Date()
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const targetDay = daysOfWeek.indexOf(day)

  const currentDay = now.getDay()
  const daysUntilTarget = (targetDay - currentDay + 7) % 7

  const deadlineDate = new Date(now)
  deadlineDate.setDate(now.getDate() + daysUntilTarget)
  deadlineDate.setHours(hour, minute, 0, 0)

  // 如果截止时间已过，设置为下周的截止时间
  if (now > deadlineDate && daysUntilTarget !== 0) {
    deadlineDate.setDate(deadlineDate.getDate() + 7)
  }

  return now < deadlineDate
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const week = searchParams.get('week')
    const year = searchParams.get('year')

    if (!week || !year) {
      return NextResponse.json(
        { error: '缺少周次或年份参数' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // 获取学生总数和各区队人数
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('squad')

    if (studentsError) {
      throw studentsError
    }

    const squad1Total = students.filter(s => s.squad === '一区队').length
    const squad2Total = students.filter(s => s.squad === '二区队').length

    // 获取提交的学生数据
    let reports: any[] = []
    let reportsError: any = null

    // 查询传入的周次
    const { data: weekReports, error: weekError } = await supabase
      .from('weekly_reports')
      .select('student_id, submitted_at')
      .eq('week_number', parseInt(week))
      .eq('year', parseInt(year))

    // 同时查询下一周的数据（因为周一0:00后提交的会被计入下一周）
    // 计算下一周周次
    let nextWeek = parseInt(week) + 1
    let nextYear = parseInt(year)

    // 如果超过52周，进入下一年
    if (nextWeek > 52) {
      nextWeek = 1
      nextYear = parseInt(year) + 1
    }

    const { data: nextWeekReports } = await supabase
      .from('weekly_reports')
      .select('student_id, submitted_at')
      .eq('week_number', nextWeek)
      .eq('year', nextYear)

    if (weekError) {
      reportsError = weekError
    } else {
      // 合并数据，去重（同一学生只算一次）
      const studentMap = new Map()
      ;[...(weekReports || []), ...(nextWeekReports || [])].forEach((r: any) => {
        if (!studentMap.has(r.student_id)) {
          studentMap.set(r.student_id, r)
        }
      })
      reports = Array.from(studentMap.values())
    }

    if (reportsError) {
      throw reportsError
    }

    const submittedStudentIds = new Set(reports.map(r => r.student_id))

    // 获取已提交学生的区队信息
    const { data: submittedStudents, error: submittedError } = await supabase
      .from('students')
      .select('id, squad')
      .in('id', Array.from(submittedStudentIds))

    if (submittedError) {
      throw submittedError
    }

    const squad1Submitted = submittedStudents.filter(s => s.squad === '一区队').length
    const squad2Submitted = submittedStudents.filter(s => s.squad === '二区队').length

    const stats = {
      total: students.length,
      submitted: reports.length,
      unsubmitted: students.length - reports.length,
      squad1Total,
      squad1Submitted,
      squad2Total,
      squad2Submitted,
    }

    return NextResponse.json({ stats })
  } catch (error) {
    console.error('获取统计数据失败:', error)
    return NextResponse.json(
      { error: '获取统计数据失败' },
      { status: 500 }
    )
  }
}
