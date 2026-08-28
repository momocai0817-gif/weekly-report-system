import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgres://weekly:weekly_app_2026@127.0.0.1:5432/weekly_report',
  max: 5,
})

// 计算某周的时间范围（周一到周日）
function getWeekRange(week: number, year: number): { start: Date; end: Date } {
  const startDate = new Date(process.env.SEMESTER_START_DATE || '2025-02-24')
  const startDateThisYear = new Date(year, startDate.getMonth(), startDate.getDate())

  // 调整到当周的周一
  const startDayOfWeek = startDateThisYear.getDay()
  const daysToMonday = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1
  const startWeekMonday = new Date(startDateThisYear)
  startWeekMonday.setDate(startWeekMonday.getDate() - daysToMonday)

  // 计算目标周的开始日期（周一）
  const weekStartMonday = new Date(startWeekMonday)
  weekStartMonday.setDate(weekStartMonday.getDate() + (week - 1) * 7)

  // 该周结束日期（周日晚上）
  const weekEndSunday = new Date(weekStartMonday)
  weekEndSunday.setDate(weekEndSunday.getDate() + 6)
  weekEndSunday.setHours(23, 59, 59, 999)

  return { start: weekStartMonday, end: weekEndSunday }
}

// 计算某周的截止时间（该周周一23:59:59.999）
function getWeekDeadline(week: number, year: number): Date {
  const range = getWeekRange(week, year)
  const deadline = new Date(range.start)
  deadline.setHours(23, 59, 59, 999)
  return deadline
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

    const w = parseInt(week)
    const y = parseInt(year)

    // 直接用 pg JOIN 查询，避免 lib/supabase.ts 不支持 PostgREST 嵌入语法的问题
    const { rows } = await pool.query(
      `SELECT wr.id, wr.student_id, wr.week_number, wr.year,
              wr.contacted_professor, wr.professor_replied, wr.reply_details,
              wr.not_contacted_reason, wr.signature, wr.consultation_topic,
              wr.preparation_work, wr.question_list, wr.advisor_feedback,
              wr.follow_up_plan, wr.submitted_at, wr.contact_initiator,
              s.name        AS s_name,
              s.student_id  AS s_student_id,
              s.squad       AS s_squad,
              s.advisor     AS s_advisor
       FROM weekly_reports wr
       JOIN students s ON s.id = wr.student_id
       WHERE wr.week_number = $1 AND wr.year = $2
       ORDER BY wr.submitted_at DESC`,
      [w, y]
    )

    const deadline = getWeekDeadline(w, y)
    console.log(`=== 第${w}周 (${y}年) ===`)
    console.log('截止时间:', deadline.toISOString(), deadline.toLocaleString('zh-CN'))

    const reports = rows.map((r: any) => {
      const submittedAt = new Date(r.submitted_at)
      const isLate = submittedAt.getTime() > deadline.getTime()
      console.log(`${r.s_name}: 提交于 ${submittedAt.toISOString()} (${submittedAt.toLocaleString('zh-CN')}) - ${isLate ? '晚交' : '按时'}`)
      return {
        id: r.id,
        student_id: r.student_id,
        week_number: r.week_number,
        year: r.year,
        contacted_professor: r.contacted_professor,
        professor_replied: r.professor_replied,
        reply_details: r.reply_details,
        not_contacted_reason: r.not_contacted_reason,
        signature: r.signature,
        consultation_topic: r.consultation_topic,
        preparation_work: r.preparation_work,
        question_list: r.question_list,
        advisor_feedback: r.advisor_feedback,
        follow_up_plan: r.follow_up_plan,
        submitted_at: r.submitted_at,
        contact_initiator: r.contact_initiator,
        student: {
          name: r.s_name,
          student_id: r.s_student_id,
          squad: r.s_squad,
          advisor: r.s_advisor,
        },
        is_late: isLate,
      }
    })

    return NextResponse.json({ reports }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error) {
    console.error('获取周报失败:', error)
    return NextResponse.json(
      { error: '获取周报失败' },
      { status: 500 }
    )
  }
}

// 管理员补录/修正联系发起方（历史周报提交时系统还没记录这个字段）
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, contact_initiator } = body

    if (!id) {
      return NextResponse.json({ error: '缺少周报 ID' }, { status: 400 })
    }
    if (contact_initiator !== null && contact_initiator !== 'student' && contact_initiator !== 'teacher') {
      return NextResponse.json(
        { error: 'contact_initiator 只能为 student / teacher / null' },
        { status: 400 }
      )
    }

    const { rowCount } = await pool.query(
      `UPDATE weekly_reports SET contact_initiator = $1 WHERE id = $2`,
      [contact_initiator, id]
    )

    if (rowCount === 0) {
      return NextResponse.json({ error: '周报不存在' }, { status: 404 })
    }

    return NextResponse.json({ success: true, id, contact_initiator })
  } catch (error) {
    console.error('更新联系发起方失败:', error)
    return NextResponse.json({ error: '更新失败' }, { status: 500 })
  }
}