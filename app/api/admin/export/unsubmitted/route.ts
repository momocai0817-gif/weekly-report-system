import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import * as XLSX from 'xlsx'

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

    // 获取所有学生
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, name, student_id, squad, advisor')
      .order('squad', { ascending: true })
      .order('student_id', { ascending: true })

    if (studentsError) {
      throw studentsError
    }

    // 获取本周已提交的学生ID
    const { data: reports, error: reportsError } = await supabase
      .from('weekly_reports')
      .select('student_id, submitted_at')
      .eq('week_number', parseInt(week))
      .eq('year', parseInt(year))

    if (reportsError) {
      throw reportsError
    }

    const submittedMap = new Map(
      reports.map(r => [r.student_id, r.submitted_at])
    )

    // 创建Excel数据
    const excelData = students.map(student => ({
      '学号': student.student_id,
      '姓名': student.name,
      '区队': student.squad,
      '导师': student.advisor,
      '提交状态': submittedMap.has(student.id) ? '已提交' : '未提交',
      '提交时间': submittedMap.has(student.id)
        ? formatDateTime(submittedMap.get(student.id)!)
        : '',
    }))

    // 创建工作簿
    const worksheet = XLSX.utils.json_to_sheet(excelData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '未交名单')

    // 生成Excel文件
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="未交名单_第${week}周.xlsx"`,
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
