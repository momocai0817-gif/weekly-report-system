import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import * as XLSX from 'xlsx'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const week = searchParams.get('week')
    const year = searchParams.get('year')

    const supabase = createServiceClient()

    // 取所有重填记录（refill_resolved_at 非空）
    const { data: reports, error } = await supabase
      .from('weekly_reports')
      .select('*')

    if (error) {
      console.error('查询重填周报错误:', error)
      return NextResponse.json({ error: '查询失败' }, { status: 500 })
    }

    let filtered = (reports || []).filter((r: any) => !!r.refill_resolved_at)
    if (week) filtered = filtered.filter((r: any) => r.week_number === parseInt(week))
    if (year) filtered = filtered.filter((r: any) => r.year === parseInt(year))

    if (filtered.length === 0) {
      return NextResponse.json({ error: '暂无重填记录' }, { status: 404 })
    }

    // 关联学生
    const studentIds = Array.from(new Set(filtered.map((r: any) => r.student_id)))
    const studentMap = new Map<string, any>()
    const { data: students } = await supabase
      .from('students')
      .select('id, name, student_id, squad, advisor')
      .in('id', studentIds as string[])
    ;(students || []).forEach((s: any) => studentMap.set(s.id, s))

    // 按学号排序
    filtered.sort((a: any, b: any) => {
      const sa = studentMap.get(a.student_id)?.student_id || ''
      const sb = studentMap.get(b.student_id)?.student_id || ''
      return sa.localeCompare(sb, 'zh-CN', { numeric: true })
    })

    const reportToRow = (report: any) => {
      const student = studentMap.get(report.student_id)
      const questions = report.question_list ? report.question_list.split('\n') : []
      return {
        '学号': student?.student_id || '',
        '姓名': student?.name || '',
        '区队': student?.squad || '',
        '导师': student?.advisor || '',
        '提交时间': formatDateTime(report.submitted_at),
        '1.本周是否咨询过导师问题？': report.contacted_professor ? '是' : '否',
        '2.联系发起方': report.contacted_professor
          ? (report.contact_initiator === 'teacher' ? '老师主动' : '学生主动')
          : '',
        '3.未咨询原因/所处阶段': !report.contacted_professor ? (report.not_contacted_reason || '') : '',
        '4.导师是否回复？': report.contacted_professor ? (report.professor_replied ? '是' : '否') : '',
        '5.准备工作': report.contacted_professor ? (report.preparation_work || '') : '',
        '6.问题1': (report.contacted_professor && questions.length > 0) ? (questions[0] || '') : '',
        '7.问题2': (report.contacted_professor && questions.length > 1) ? (questions[1] || '') : '',
        '8.导师反馈': (report.contacted_professor && report.professor_replied) ? (report.advisor_feedback || '') : '',
        '重填时间': formatDateTime(report.refill_resolved_at),
      }
    }

    const styleWorksheet = (ws: any) => {
      ws['!cols'] = [
        { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
        { wch: 18 }, { wch: 10 }, { wch: 12 }, { wch: 40 },
        { wch: 8 }, { wch: 50 }, { wch: 30 }, { wch: 30 },
        { wch: 50 }, { wch: 18 },
      ]
      if (ws['!ref']) {
        const range = XLSX.utils.decode_range(ws['!ref'])
        for (let R = range.s.r; R <= range.e.r; ++R) {
          const wrapCols = [7, 9, 10, 11, 12]
          for (const C of wrapCols) {
            const addr = XLSX.utils.encode_cell({ r: R, c: C })
            if (ws[addr]) ws[addr].s = { alignment: { wrapText: true, vertical: 'top' } }
          }
          if (R === 0 && ws[XLSX.utils.encode_cell({ r: 0, c: 0 })]) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
              const addr = XLSX.utils.encode_cell({ r: 0, c: C })
              if (ws[addr]) ws[addr].s = {
                font: { bold: true },
                fill: { fgColor: { rgb: 'FFD9EAD3' } },
                alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
              }
            }
          }
        }
      }
    }

    const workbook = XLSX.utils.book_new()

    // 总表
    const totalWs = XLSX.utils.json_to_sheet(filtered.map(reportToRow))
    styleWorksheet(totalWs)
    XLSX.utils.book_append_sheet(workbook, totalWs, '总表')

    // 一区队
    const squad1 = filtered.filter((r: any) => studentMap.get(r.student_id)?.squad === '一区队')
    if (squad1.length > 0) {
      const ws = XLSX.utils.json_to_sheet(squad1.map(reportToRow))
      styleWorksheet(ws)
      XLSX.utils.book_append_sheet(workbook, ws, '一区队')
    }

    // 二区队
    const squad2 = filtered.filter((r: any) => studentMap.get(r.student_id)?.squad === '二区队')
    if (squad2.length > 0) {
      const ws = XLSX.utils.json_to_sheet(squad2.map(reportToRow))
      styleWorksheet(ws)
      XLSX.utils.book_append_sheet(workbook, ws, '二区队')
    }

    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx', bookSST: false })
    const weekPart = week ? `第${week}周` : '全部'
    const filename = `重填周报_${weekPart}.xlsx`

    return new NextResponse(new Uint8Array(excelBuffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    })
  } catch (error) {
    console.error('导出重填周报失败:', error)
    return NextResponse.json({ error: '导出失败' }, { status: 500 })
  }
}

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
