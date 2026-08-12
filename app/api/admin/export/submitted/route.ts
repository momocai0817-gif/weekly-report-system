import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import * as XLSX from 'xlsx'

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

  if (now > deadlineDate && daysUntilTarget !== 0) {
    deadlineDate.setDate(deadlineDate.getDate() - 7)
  }

  return now < deadlineDate
}

function formatDateTime(date: string): string {
  const d = new Date(date)
  // 使用北京时间（UTC+8）格式化
  const chinaTime = new Date(d.getTime() + 8 * 60 * 60 * 1000)
  return chinaTime.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Shanghai'
  })
}

// 创建自动换行样式
function createWrapCellStyle() {
  return {
    alignment: {
      wrapText: true,
      vertical: 'top',
    },
  }
}

// 按导师分组生成数据
function generateAdvisorSheets(
  reports: any[],
  studentMap: Map<string, any>
): Map<string, any[]> {
  const advisorGroups = new Map<string, any[]>()

  reports.forEach((report) => {
    const student = studentMap.get(report.student_id)
    if (!student) return

    const advisor = student.advisor || '未分配导师'
    if (!advisorGroups.has(advisor)) {
      advisorGroups.set(advisor, [])
    }

    advisorGroups.get(advisor)!.push({
      '学号': student.student_id,
      '姓名': student.name,
      '区队': student.squad,
      '导师': advisor,
      '提交时间': formatDateTime(report.submitted_at),
      '1.本周是否咨询过导师问题？': report.contacted_professor ? '是' : '否',
      '2.未咨询原因/所处阶段': !report.contacted_professor ? (report.not_contacted_reason || '') : '',
      '3.导师是否回复？': report.contacted_professor ? (report.professor_replied ? '是' : '否') : '',
      '4.准备工作': report.contacted_professor ? (report.preparation_work || '') : '',
      '5.问题1': (report.contacted_professor && report.question_list) ? (report.question_list.split('\n')[0] || '') : '',
      '6.问题2': (report.contacted_professor && report.question_list) ? (report.question_list.split('\n')[1] || '') : '',
      '7.导师反馈': (report.contacted_professor && report.professor_replied) ? (report.advisor_feedback || '') : '',
      '8.后续计划': (report.contacted_professor && report.professor_replied) ? (report.follow_up_plan || '') : '',
    })
  })

  return advisorGroups
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const week = searchParams.get('week')
    const year = searchParams.get('year')
    const squad = searchParams.get('squad')

    if (!week || !year) {
      return NextResponse.json(
        { error: '缺少周次或年份参数' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // 获取周报数据 - 查询传入的周次
    const { data: weekReports, error: weekError } = await supabase
      .from('weekly_reports')
      .select('*')
      .eq('week_number', parseInt(week))
      .eq('year', parseInt(year))

    // 如果当前在截止时间之前（周一23:59之前），需要同时查询下一周数据
    let nextWeekReports: any[] | null = null
    if (isBeforeDeadline()) {
      let nextWeek = parseInt(week) + 1
      let nextYear = parseInt(year)
      if (nextWeek > 52) {
        nextWeek = 1
        nextYear = parseInt(year) + 1
      }

      const { data: nextWeekData } = await supabase
        .from('weekly_reports')
        .select('*')
        .eq('week_number', nextWeek)
        .eq('year', nextYear)

      nextWeekReports = nextWeekData || []
    }

    if (weekError) {
      console.error('查询周报错误:', weekError)
      throw weekError
    }

    // 合并数据，去重（同一学生只保留最新的提交）
    const reportMap = new Map()
    ;(weekReports || []).forEach((r: any) => {
      const existing = reportMap.get(r.student_id)
      if (!existing || new Date(r.submitted_at) > new Date(existing.submitted_at)) {
        reportMap.set(r.student_id, r)
      }
    })
    if (nextWeekReports) {
      nextWeekReports.forEach((r: any) => {
        const existing = reportMap.get(r.student_id)
        if (!existing || new Date(r.submitted_at) > new Date(existing.submitted_at)) {
          reportMap.set(r.student_id, r)
        }
      })
    }
    const reports = Array.from(reportMap.values())

    if (!reports || reports.length === 0) {
      return NextResponse.json(
        { error: '该周暂无提交记录' },
        { status: 404 }
      )
    }

    // 获取所有学生ID
    const studentIds = reports.map(r => r.student_id)

    // 查询学生信息
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, name, student_id, squad, advisor')
      .in('id', studentIds)

    if (studentsError) {
      console.error('查询学生错误:', studentsError)
      throw studentsError
    }

    // 创建学生信息映射
    const studentMap = new Map(
      students.map(s => [s.id, s])
    )

    // 生成Excel数据
    const excelData = reports
      .filter(report => {
        const student = studentMap.get(report.student_id)
        return student && (!squad || student.squad === squad)
      })
      .sort((a, b) => {
        const studentA = studentMap.get(a.student_id)
        const studentB = studentMap.get(b.student_id)
        return (studentA?.student_id || '').localeCompare(studentB?.student_id || '', 'zh-CN', { numeric: true })
      })
      .map(report => {
        const student = studentMap.get(report.student_id)
        const questions = report.question_list ? report.question_list.split('\n') : []
        return {
          '学号': student?.student_id || '',
          '姓名': student?.name || '',
          '区队': student?.squad || '',
          '导师': student?.advisor || '',
          '提交时间': formatDateTime(report.submitted_at),
          '1.本周是否咨询过导师问题？': report.contacted_professor ? '是' : '否',
          '2.未咨询原因/所处阶段': !report.contacted_professor ? (report.not_contacted_reason || '') : '',
          '3.导师是否回复？': report.contacted_professor ? (report.professor_replied ? '是' : '否') : '',
          '4.准备工作': report.contacted_professor ? (report.preparation_work || '') : '',
          '5.问题1': (report.contacted_professor && questions.length > 0) ? (questions[0] || '') : '',
          '6.问题2': (report.contacted_professor && questions.length > 1) ? (questions[1] || '') : '',
          '7.导师反馈': (report.contacted_professor && report.professor_replied) ? (report.advisor_feedback || '') : '',
          '8.后续计划': (report.contacted_professor && report.professor_replied) ? (report.follow_up_plan || '') : '',
        }
      })

    // 创建Excel工作簿
    const workbook = XLSX.utils.book_new()

    // 添加总表（第一个sheet）
    const totalWorksheet = XLSX.utils.json_to_sheet(excelData)

    // 设置列宽
    totalWorksheet['!cols'] = [
      { wch: 12 },  // 学号
      { wch: 10 },  // 姓名
      { wch: 10 },  // 区队
      { wch: 10 },  // 导师
      { wch: 18 },  // 提交时间
      { wch: 10 },  // 1.本周是否咨询过导师问题？
      { wch: 40 },  // 2.未咨询原因/所处阶段（加宽以显示更多文字）
      { wch: 8 },   // 3.导师是否回复？
      { wch: 50 },  // 4.准备工作（加宽）
      { wch: 30 },  // 5.问题1
      { wch: 30 },  // 6.问题2
      { wch: 50 },  // 7.导师反馈（加宽）
      { wch: 30 },  // 8.后续计划
    ]

    // 为包含文字的列（G列=索引6：2.未咨询原因，I列=索引8：4.准备工作，L列=索引11：7.导师反馈）设置自动换行样式
    if (totalWorksheet['!ref']) {
      const range = XLSX.utils.decode_range(totalWorksheet['!ref'])
      for (let R = range.s.r; R <= range.e.r; ++R) {
      // G列（索引6）：2.未咨询原因/所处阶段
      const cellAddressG = XLSX.utils.encode_cell({ r: R, c: 6 })
      if (totalWorksheet[cellAddressG]) {
        totalWorksheet[cellAddressG].s = createWrapCellStyle()
      }
      // I列（索引8）：4.准备工作
      const cellAddressI = XLSX.utils.encode_cell({ r: R, c: 8 })
      if (totalWorksheet[cellAddressI]) {
        totalWorksheet[cellAddressI].s = createWrapCellStyle()
      }
      // L列（索引11）：7.导师反馈
      const cellAddressL = XLSX.utils.encode_cell({ r: R, c: 11 })
      if (totalWorksheet[cellAddressL]) {
        totalWorksheet[cellAddressL].s = createWrapCellStyle()
      }
      }
    }

    XLSX.utils.book_append_sheet(workbook, totalWorksheet, '总表')

    // 添加按导师分组的sheet（无论是否有区队过滤）
    const advisorGroups = generateAdvisorSheets(reports, studentMap)

    // 按导师名字排序
    const sortedAdvisors = Array.from(advisorGroups.keys()).sort((a, b) =>
      a.localeCompare(b, 'zh-CN')
    )

    sortedAdvisors.forEach((advisor) => {
      const advisorData = advisorGroups.get(advisor)!
      // sheet名称不能超过31个字符
      const sheetName = advisor.length > 28 ? advisor.substring(0, 28) : advisor
      const advisorWorksheet = XLSX.utils.json_to_sheet(advisorData)

      // 设置列宽
      advisorWorksheet['!cols'] = [
        { wch: 12 },  // 学号
        { wch: 10 },  // 姓名
        { wch: 10 },  // 区队
        { wch: 10 },  // 导师
        { wch: 18 },  // 提交时间
        { wch: 10 },  // 1.本周是否咨询过导师问题？
        { wch: 40 },  // 2.未咨询原因/所处阶段（加宽以显示更多文字）
        { wch: 8 },   // 3.导师是否回复？
        { wch: 50 },  // 4.准备工作（加宽）
        { wch: 30 },  // 5.问题1
        { wch: 30 },  // 6.问题2
        { wch: 50 },  // 7.导师反馈（加宽）
        { wch: 30 },  // 8.后续计划
      ]

      // 为包含文字的列（G列=索引6：2.未咨询原因，I列=索引8：4.准备工作，L列=索引11：7.导师反馈）设置自动换行样式
      if (advisorWorksheet['!ref']) {
        const range = XLSX.utils.decode_range(advisorWorksheet['!ref'])
        for (let R = range.s.r; R <= range.e.r; ++R) {
        // G列（索引6）：2.未咨询原因/所处阶段
        const cellAddressG = XLSX.utils.encode_cell({ r: R, c: 6 })
        if (advisorWorksheet[cellAddressG]) {
          advisorWorksheet[cellAddressG].s = createWrapCellStyle()
        }
        // I列（索引8）：4.准备工作
        const cellAddressI = XLSX.utils.encode_cell({ r: R, c: 8 })
        if (advisorWorksheet[cellAddressI]) {
          advisorWorksheet[cellAddressI].s = createWrapCellStyle()
        }
        // L列（索引11）：7.导师反馈
        const cellAddressL = XLSX.utils.encode_cell({ r: R, c: 11 })
        if (advisorWorksheet[cellAddressL]) {
          advisorWorksheet[cellAddressL].s = createWrapCellStyle()
        }
        }
      }

      XLSX.utils.book_append_sheet(workbook, advisorWorksheet, sheetName)
    })

    // 生成Excel文件
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx', bookSST: false })

    // 根据区队生成文件名
    const filename = squad
      ? `${squad}_已交名单_第${week}周.xlsx`
      : `已交名单_第${week}周.xlsx`

    return new NextResponse(new Uint8Array(excelBuffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    })
  } catch (error) {
    console.error('导出失败:', error)
    return NextResponse.json(
      { error: '导出失败' },
      { status: 500 }
    )
  }
}
