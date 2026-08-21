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

// 联系发起方转中文
function getInitiatorLabel(initiator: string | null | undefined): string {
  if (initiator === 'student') return '学生主动'
  if (initiator === 'teacher') return '老师主动'
  return ''
}

// 将单条报告转成基础行（不含分组信息）
function reportToRow(report: any, student: any) {
  const questions = report.question_list ? report.question_list.split('\n') : []
  return {
    '学号': student?.student_id || '',
    '姓名': student?.name || '',
    '区队': student?.squad || '',
    '导师': student?.advisor || '',
    '提交时间': formatDateTime(report.submitted_at),
    '1.本周是否咨询过导师问题？': report.contacted_professor ? '是' : '否',
    '2.联系发起方': report.contacted_professor
      ? getInitiatorLabel(report.contact_initiator)
      : '',
    '3.未咨询原因/所处阶段': !report.contacted_professor ? (report.not_contacted_reason || '') : '',
    '4.导师是否回复？': report.contacted_professor ? (report.professor_replied ? '是' : '否') : '',
    '5.准备工作': report.contacted_professor ? (report.preparation_work || '') : '',
    '6.问题1': (report.contacted_professor && questions.length > 0) ? (questions[0] || '') : '',
    '7.问题2': (report.contacted_professor && questions.length > 1) ? (questions[1] || '') : '',
    '8.导师反馈': (report.contacted_professor && report.professor_replied) ? (report.advisor_feedback || '') : '',
  }
}

// 按联系发起方分组 + 导师分组
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

    advisorGroups.get(advisor)!.push(reportToRow(report, student))
  })

  return advisorGroups
}

// 设置列宽 + 自动换行
function styleWorksheet(worksheet: any) {
  worksheet['!cols'] = [
    { wch: 12 },  // 学号
    { wch: 10 },  // 姓名
    { wch: 10 },  // 区队
    { wch: 10 },  // 导师
    { wch: 18 },  // 提交时间
    { wch: 10 },  // 1.本周是否咨询过导师问题？
    { wch: 12 },  // 2.联系发起方
    { wch: 40 },  // 3.未咨询原因/所处阶段
    { wch: 8 },   // 4.导师是否回复？
    { wch: 50 },  // 5.准备工作
    { wch: 30 },  // 6.问题1
    { wch: 30 },  // 7.问题2
    { wch: 50 },  // 8.导师反馈
  ]

  if (worksheet['!ref']) {
    const range = XLSX.utils.decode_range(worksheet['!ref'])
    for (let R = range.s.r; R <= range.e.r; ++R) {
      // H列（索引7）：3.未咨询原因
      const cellH = XLSX.utils.encode_cell({ r: R, c: 7 })
      if (worksheet[cellH]) worksheet[cellH].s = createWrapCellStyle()
      // J列（索引9）：5.准备工作
      const cellJ = XLSX.utils.encode_cell({ r: R, c: 9 })
      if (worksheet[cellJ]) worksheet[cellJ].s = createWrapCellStyle()
      // M列（索引12）：8.导师反馈
      const cellM = XLSX.utils.encode_cell({ r: R, c: 12 })
      if (worksheet[cellM]) worksheet[cellM].s = createWrapCellStyle()
    }
  }
}

// 安全截断 sheet 名（Excel 限制 31 字符）
function safeSheetName(name: string): string {
  return name.length > 28 ? name.substring(0, 28) : name
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

    // 过滤 + 排序 + 转行
    const filteredReports = reports.filter(report => {
      const student = studentMap.get(report.student_id)
      return student && (!squad || student.squad === squad)
    }).sort((a, b) => {
      const studentA = studentMap.get(a.student_id)
      const studentB = studentMap.get(b.student_id)
      return (studentA?.student_id || '').localeCompare(studentB?.student_id || '', 'zh-CN', { numeric: true })
    })

    // ===== Sheet 1: 总表 =====
    const excelData = filteredReports.map(report => reportToRow(report, studentMap.get(report.student_id)))

    const workbook = XLSX.utils.book_new()
    const totalWorksheet = XLSX.utils.json_to_sheet(excelData)
    styleWorksheet(totalWorksheet)
    XLSX.utils.book_append_sheet(workbook, totalWorksheet, '总表')

    // ===== Sheet 2: 按联系发起方分组 =====
    const contactedReports = filteredReports.filter(r => r.contacted_professor)
    const studentInitiated = contactedReports.filter(r => r.contact_initiator === 'student')
    const teacherInitiated = contactedReports.filter(r => r.contact_initiator === 'teacher')
    const noInitiator = contactedReports.filter(r => !r.contact_initiator) // 历史数据兼容

    if (studentInitiated.length > 0) {
      const ws = XLSX.utils.json_to_sheet(
        studentInitiated.map(r => reportToRow(r, studentMap.get(r.student_id)))
      )
      styleWorksheet(ws)
      XLSX.utils.book_append_sheet(workbook, ws, '学生主动联系')
    }
    if (teacherInitiated.length > 0) {
      const ws = XLSX.utils.json_to_sheet(
        teacherInitiated.map(r => reportToRow(r, studentMap.get(r.student_id)))
      )
      styleWorksheet(ws)
      XLSX.utils.book_append_sheet(workbook, ws, '老师主动联系')
    }
    if (noInitiator.length > 0) {
      const ws = XLSX.utils.json_to_sheet(
        noInitiator.map(r => reportToRow(r, studentMap.get(r.student_id)))
      )
      styleWorksheet(ws)
      XLSX.utils.book_append_sheet(workbook, ws, '未注明(历史)')
    }

    // ===== Sheet 3-N: 按导师分组 =====
    const advisorGroups = generateAdvisorSheets(filteredReports, studentMap)
    const sortedAdvisors = Array.from(advisorGroups.keys()).sort((a, b) =>
      a.localeCompare(b, 'zh-CN')
    )

    sortedAdvisors.forEach((advisor) => {
      const advisorData = advisorGroups.get(advisor)!
      const advisorWorksheet = XLSX.utils.json_to_sheet(advisorData)
      styleWorksheet(advisorWorksheet)
      XLSX.utils.book_append_sheet(workbook, advisorWorksheet, safeSheetName(advisor))
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