import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

interface UnrepliedDetail {
  week: number
  year: number
  contact_initiator: 'student' | 'teacher' | null
}

interface UnrepliedStudent {
  student: {
    id: string
    name: string
    student_id: string
    squad: string
    advisor: string
  }
  unrepliedDetails: UnrepliedDetail[]
  unrepliedWeeks: number[]
  total: number
  currentStreak: number
  maxStreak: number
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const week = searchParams.get('week')
    const year = searchParams.get('year')

    // 构建内部请求URL
    const baseUrl = request.nextUrl.origin
    const unrepliedUrl = new URL('/api/admin/unreplied', baseUrl)
    if (week) unrepliedUrl.searchParams.set('week', week)
    if (year) unrepliedUrl.searchParams.set('year', year)

    // 获取未回复数据
    const unrepliedResponse = await fetch(unrepliedUrl.toString())
    const unrepliedData = await unrepliedResponse.json()

    if (!unrepliedResponse.ok) {
      throw new Error(unrepliedData.error || '获取数据失败')
    }

    const { advisors, summary } = unrepliedData as {
      advisors: {
        advisor: string
        students: UnrepliedStudent[]
        studentCount: number
        maxStreak: number
      }[]
      summary: {
        currentWeek: number
        currentYear: number
        scanFromWeek: number
      }
    }

    const allStudents: UnrepliedStudent[] = advisors.flatMap((a) => a.students)

    if (allStudents.length === 0) {
      return NextResponse.json(
        { error: '暂无学生提问但导师未回复的情况' },
        { status: 404 }
      )
    }

    // 周次明细文案：第25周(学生联系)、第26周(老师联系)
    const weekText = (s: UnrepliedStudent) =>
      s.unrepliedDetails
        .map((d) => {
          const who =
            d.contact_initiator === 'student'
              ? '学生联系'
              : d.contact_initiator === 'teacher'
                ? '老师联系'
                : '未记录'
          return `第${d.week}周(${who})`
        })
        .join('、')

    const toRow = (s: UnrepliedStudent) => ({
      '学号': s.student.student_id,
      '姓名': s.student.name,
      '区队': s.student.squad,
      '导师': s.student.advisor,
      '未回复周次明细': weekText(s),
      '未回复周数': s.total,
      '连续未回复周数': s.currentStreak,
    })

    // 总表：每个学生一行，写清导师、第几周未回复
    const excelData = allStudents.map(toRow)

    // 按导师分组
    const advisorGroups = new Map<string, any[]>()
    advisors.forEach((group) => {
      advisorGroups.set(
        group.advisor,
        group.students.map(toRow)
      )
    })

    // 创建工作簿
    const workbook = XLSX.utils.book_new()

    // 添加总表
    const worksheet = XLSX.utils.json_to_sheet(excelData)
    XLSX.utils.book_append_sheet(workbook, worksheet, '未回复总表')

    // 按导师分组添加sheet
    const sortedAdvisors = Array.from(advisorGroups.keys()).sort((a, b) =>
      a.localeCompare(b, 'zh-CN')
    )
    sortedAdvisors.forEach((advisor) => {
      const advisorData = advisorGroups.get(advisor)!
      // sheet名称不能超过31个字符
      const sheetName = advisor.length > 26 ? advisor.substring(0, 26) : advisor
      const advisorWorksheet = XLSX.utils.json_to_sheet(advisorData)
      XLSX.utils.book_append_sheet(workbook, advisorWorksheet, sheetName)
    })

    // 生成Excel文件
    const excelBuffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
      bookSST: false,
    })

    const filename = `导师未回复检测_第${summary.currentWeek}周.xlsx`

    return new NextResponse(new Uint8Array(excelBuffer), {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    })
  } catch (error) {
    console.error('导出失败:', error)
    return NextResponse.json({ error: '导出失败' }, { status: 500 })
  }
}
