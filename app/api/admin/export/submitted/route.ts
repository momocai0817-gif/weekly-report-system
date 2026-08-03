import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import * as XLSX from 'xlsx'

function formatDateTime(date: string): string {
  const d = new Date(date)
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
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
      '4.具体情况说明': report.contacted_professor && report.professor_replied ? (report.reply_details || '') : '',
      '签名': report.signature ? '已签名' : '未签名',
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

    // 获取周报数据 - 查询传入的周次 + 下一周
    const { data: weekReports, error: weekError } = await supabase
      .from('weekly_reports')
      .select('*')
      .eq('week_number', parseInt(week))
      .eq('year', parseInt(year))

    // 计算下一周周次（处理跨年）
    let nextWeek = parseInt(week) + 1
    let nextYear = parseInt(year)
    if (nextWeek > 52) {
      nextWeek = 1
      nextYear = parseInt(year) + 1
    }

    const { data: nextWeekReports } = await supabase
      .from('weekly_reports')
      .select('*')
      .eq('week_number', nextWeek)
      .eq('year', nextYear)

    if (weekError) {
      console.error('查询周报错误:', weekError)
      throw weekError
    }

    // 合并数据，去重（同一学生只保留最新的提交）
    const reportMap = new Map()
    ;[...(weekReports || []), ...(nextWeekReports || [])].forEach((r: any) => {
      const existing = reportMap.get(r.student_id)
      if (!existing || new Date(r.submitted_at) > new Date(existing.submitted_at)) {
        reportMap.set(r.student_id, r)
      }
    })
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
        return {
          '学号': student?.student_id || '',
          '姓名': student?.name || '',
          '区队': student?.squad || '',
          '导师': student?.advisor || '',
          '提交状态': '已提交',
          '提交时间': formatDateTime(report.submitted_at),
          '1.本周是否咨询过导师问题？': report.contacted_professor ? '是' : '否',
          '2.未咨询原因/所处阶段': !report.contacted_professor ? (report.not_contacted_reason || '') : '',
          '3.导师是否回复？': report.contacted_professor ? (report.professor_replied ? '是' : '否') : '',
          '4.具体情况说明': (report.contacted_professor && report.professor_replied) ? (report.reply_details || '') : '',
          '签名': report.signature ? '已签名' : '未签名',
        }
      })

    // 创建Excel工作簿
    const workbook = XLSX.utils.book_new()

    // 添加总表（第一个sheet）
    const totalWorksheet = XLSX.utils.json_to_sheet(excelData)
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
