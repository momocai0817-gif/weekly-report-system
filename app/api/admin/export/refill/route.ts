import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import * as XLSX from 'xlsx'

function formatDateTime(date: string | null | undefined): string {
  if (!date) return ''
  const d = new Date(date)
  const chinaTime = new Date(d.getTime() + 8 * 60 * 60 * 1000)
  return chinaTime.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function styleWorksheet(worksheet: any) {
  worksheet['!cols'] = [
    { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
    { wch: 12 }, { wch: 18 }, { wch: 40 }, { wch: 10 },
    { wch: 10 }, { wch: 18 }, { wch: 50 }, { wch: 30 },
    { wch: 30 }, { wch: 50 }, { wch: 40 }, { wch: 18 }, { wch: 40 },
  ]
  if (worksheet['!ref']) {
    const range = XLSX.utils.decode_range(worksheet['!ref'])
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C })
        if (!worksheet[cellAddress]) continue
        if (R === 0) {
          worksheet[cellAddress].s = {
            font: { bold: true },
            fill: { fgColor: { rgb: 'FFD9EAD3' } },
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
          }
        } else {
          worksheet[cellAddress].s = {
            alignment: { vertical: 'top', wrapText: true },
          }
        }
      }
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    const searchParams = request.nextUrl.searchParams
    const week = searchParams.get('week')
    const year = searchParams.get('year')

    // 只导出已重填的报告
    const { data: reports, error } = await supabase
      .from('weekly_reports')
      .select('*')

    if (error) {
      console.error('查询重填列表错误:', error)
      return NextResponse.json({ error: '查询失败' }, { status: 500 })
    }

    let filtered = (reports || []).filter((r: any) => !!r.refill_resolved_at)
    if (week) filtered = filtered.filter((r: any) => r.week_number === parseInt(week))
    if (year) filtered = filtered.filter((r: any) => r.year === parseInt(year))

    // 关联学生（pg 版不支持嵌套 join，在 Node 端拼接）
    const studentIds = Array.from(new Set(filtered.map((r: any) => r.student_id)))
    const studentMap = new Map<string, any>()
    if (studentIds.length > 0) {
      const { data: students } = await supabase
        .from('students')
        .select('id, name, student_id, squad, advisor')
        .in('id', studentIds as string[])
      ;(students || []).forEach((s: any) => studentMap.set(s.id, s))
    }

    if (filtered.length === 0) {
      return NextResponse.json(
        { error: '暂无重填记录' },
        { status: 404 }
      )
    }

    // 按学号排序
    filtered.sort((a: any, b: any) => {
      const sa = studentMap.get(a.student_id)?.student_id || ''
      const sb = studentMap.get(b.student_id)?.student_id || ''
      return sa.localeCompare(sb, 'zh-CN', { numeric: true })
    })

    const excelData = filtered.map((r: any) => {
      const stu = studentMap.get(r.student_id)
      const questions = r.question_list ? r.question_list.split('\n') : []
      return {
        '学号': stu?.student_id || '',
        '姓名': stu?.name || '',
        '区队': stu?.squad || '',
        '导师': stu?.advisor || '',
        '周次': `第${r.week_number}周 (${r.year}年)`,
        '联系发起方': r.contacted_professor
          ? (r.contact_initiator === 'teacher' ? '老师主动联系' : '学生主动联系')
          : '',
        '提交时间': formatDateTime(r.submitted_at),
        '准备工作': r.preparation_work || '',
        '问题1': questions[0] || '',
        '问题2': questions[1] || '',
        '导师反馈': r.advisor_feedback || '',
        '未咨询原因': r.not_contacted_reason || '',
        '重填时间': formatDateTime(r.refill_resolved_at),
      }
    })

    const workbook = XLSX.utils.book_new()

    const worksheet = XLSX.utils.json_to_sheet(excelData)
    styleWorksheet(worksheet)
    XLSX.utils.book_append_sheet(workbook, worksheet, '重填名单')

    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx', bookSST: false })
    const weekPart = week ? `第${week}周` : '全部'
    const filename = `重填名单_${weekPart}.xlsx`

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    })
  } catch (error) {
    console.error('导出重填列表错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
