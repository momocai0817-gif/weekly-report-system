import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import { getCurrentWeek } from '@/lib/utils'

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgres://weekly:weekly_app_2026@127.0.0.1:5432/weekly_report',
  max: 5,
})

// 跨年安全地把 (year, week) 折叠成一个可比序号
function weekSeq(year: number, week: number): number {
  return year * 60 + week
}

interface UnrepliedRow {
  student_id: string
  week_number: number
  year: number
  contact_initiator: 'student' | 'teacher' | null
  name: string
  student_id_label: string
  squad: string
  advisor: string
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const week = searchParams.get('week')
    const year = searchParams.get('year')

    // 计算检测截止周（默认当前周），向前扫描所有历史周报
    const currentWeekData = getCurrentWeek()
    const currentWeekNumber = week ? parseInt(week) : currentWeekData.weekNumber
    const currentYearNumber = year ? parseInt(year) : currentWeekData.year

    // 上一周（用于「连续两周」提示文案）
    let previousWeekNumber = currentWeekNumber - 1
    let previousYearNumber = currentYearNumber
    if (previousWeekNumber < 1) {
      previousWeekNumber = 52
      previousYearNumber = currentYearNumber - 1
    }

    // 学生咨询过（contacted_professor=true）但导师未回复（professor_replied=false）
    // 的全部记录，检测范围为「开学以来 ~ 所选周」
    const { rows } = await pool.query(
      `SELECT wr.student_id, wr.week_number, wr.year, wr.contact_initiator,
              s.name, s.student_id AS student_id_label, s.squad, s.advisor
       FROM weekly_reports wr
       JOIN students s ON s.id = wr.student_id
       WHERE wr.contacted_professor = TRUE
         AND wr.professor_replied = FALSE
         AND (wr.year < $2 OR (wr.year = $2 AND wr.week_number <= $1))
       ORDER BY s.advisor, s.name, wr.year, wr.week_number`,
      [currentWeekNumber, currentYearNumber]
    )

    const reports = rows as unknown as UnrepliedRow[]

    // 按导师 → 学生 归组，同时算每个学生的未回复周次明细和连续周数
    const advisorMap = new Map<
      string,
      Map<
        string,
        {
          student: {
            id: string
            name: string
            student_id: string
            squad: string
            advisor: string
          }
          weeks: { week: number; year: number; contact_initiator: 'student' | 'teacher' | null }[]
        }
      >
    >()

    for (const r of reports) {
      const advisor = r.advisor || '未分配导师'
      if (!advisorMap.has(advisor)) advisorMap.set(advisor, new Map())
      const students = advisorMap.get(advisor)!
      if (!students.has(r.student_id)) {
        students.set(r.student_id, {
          student: {
            id: r.student_id,
            name: r.name,
            student_id: r.student_id_label,
            squad: r.squad,
            advisor: r.advisor,
          },
          weeks: [],
        })
      }
      students.get(r.student_id)!.weeks.push({
        week: r.week_number,
        year: r.year,
        contact_initiator: r.contact_initiator,
      })
    }

    // 计算每个学生的连续未回复情况（按周次连续，例如 25、26、27 周 → 连续 3 周）
    const advisors = Array.from(advisorMap.entries()).map(([advisor, studentsMap]) => {
      const students = Array.from(studentsMap.values()).map(({ student, weeks }) => {
        weeks.sort((a, b) => weekSeq(a.year, a.week) - weekSeq(b.year, b.week))
        let currentStreak = 1
        let maxStreak = 1
        for (let i = 1; i < weeks.length; i++) {
          if (weekSeq(weeks[i].year, weeks[i].week) === weekSeq(weeks[i - 1].year, weeks[i - 1].week) + 1) {
            currentStreak++
          } else {
            currentStreak = 1
          }
          if (currentStreak > maxStreak) maxStreak = currentStreak
        }
        return {
          student,
          // 未回复周次明细：第几周、当时的联系发起方
          unrepliedDetails: weeks,
          unrepliedWeeks: weeks.map((w) => w.week),
          total: weeks.length,
          currentStreak,
          maxStreak,
        }
      })
      // 连续未回复周数多的学生排前面
      students.sort((a, b) => b.currentStreak - a.currentStreak || b.total - a.total)
      return {
        advisor,
        students,
        studentCount: students.length,
        maxStreak: Math.max(...students.map((s) => s.currentStreak)),
      }
    })

    // 连续未回复周数多的导师排前面
    advisors.sort((a, b) => b.maxStreak - a.maxStreak || b.studentCount - a.studentCount)

    const allStudents = advisors.flatMap((a) => a.students)
    const scanFromWeek = reports.length
      ? Math.min(...reports.map((r) => r.week_number))
      : currentWeekNumber

    return NextResponse.json({
      // 按导师分组的完整明细
      advisors,
      summary: {
        total: allStudents.length,
        advisorCount: advisors.length,
        // 连续两周及以上没回复的学生数
        consecutiveTotal: allStudents.filter((s) => s.currentStreak >= 2).length,
        currentWeek: currentWeekNumber,
        currentYear: currentYearNumber,
        previousWeek: previousWeekNumber,
        previousYear: previousYearNumber,
        scanFromWeek,
      },
    })
  } catch (error) {
    console.error('检测未回复情况失败:', error)
    return NextResponse.json({ error: '检测失败' }, { status: 500 })
  }
}
