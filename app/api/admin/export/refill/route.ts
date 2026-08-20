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
    timeZone: 'Asia/Shanghai'
  })
}

function getInitiatorLabel(initiator: string | null | undefined): string {
  if (initiator === 'student') return '学生主动'
  if (initiator === 'teacher') return '老师主动'
  return '未注明'
}

function createWrapCellStyle() {
  return {
    alignment: {
      wrapText: true,
      vertical: 'top',
    },
  }
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
      const wrapCols = [6, 9, 10, 11, 12, 13, 14, 16]
      wrapCols.forEach(c => {
        const addr = XLSX.utils.encode_cell({ r: R, c })
        if (worksheet[addr]) worksheet[addr].s = createWrapCellStyle()
      })
    }
  }
}

// GET: 导出需要重填的学生名单（学委单独存档用）
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const week = searchParams.get('week')
    const year = searchParams.get('year')
    const squad = searchParams.get('squad')
    const status = searchParams.get('status') // 'active' / 'resolved' / null

    const supabase = createServiceClient()

    let query = supabase
      .from('weekly_reports')
      .select('*')
      .eq('needs_refill', true)

    if (week) query = query.eq('week_number', parseInt(week))
    if (year) query = query.eq('year', parseInt(year))

    const ordered = (query as any).order
      ? query.order('refill_requested_at', { ascending: false })
      : query

    const { data: reports, error } = await ordered

    if (error) {
      console.error('查询重填列表错误:', error)
      if (error.message && error.message.includes('needs_refill')) {
        return NextResponse.json(
          { error: '数据库尚未启用重填功能，请先执行迁移脚本' },
          { status: 500 }
        )
      }
      return NextResponse.json(
        { error: '查询失败' },
        { status: 500 }
      )
    }

    let filtered = reports || []
    if (status === 'active') {
      filtered = filtered.filter((r: any) => !r.refill_resolved_at)
    } else if (status === 'resolved') {
      filtered = filtered.filter((r: any) => r.refill_resolved_at)
    }

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

    // 按区队过滤（在 Node 端）
    if (squad) {
      filtered = filtered.filter((r: any) => {
        const stu = studentMap.get(r.student_id)
        return stu && stu.squad === squad
      })
    }

    if (filtered.length === 0) {
      return NextResponse.json(
        { error: '暂无标记重填的记录' },
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
      const statusLabel = !r.refill_resolved_at ? '⏳ 待学生重填' : '✓ 已重填'
      return {
        '学号': stu?.student_id || '',
        '姓名': stu?.name || '',
        '区队': stu?.squad || '',
        '导师': stu?.advisor || '',
        '周次': `第${r.week_number}周 (${r.year}年)`,
        '标记时间': formatDateTime(r.refill_requested_at),
        '重填原因': r.refill_reason || '',
        '当前状态': statusLabel,
        '联系发起方': r.contacted_professor ? getInitiatorLabel(r.contact_initiator) : '',
        '原提交时间': formatDateTime(r.submitted_at),
        '准备工作': r.preparation_work || '',
        '问题1': questions[0] || '',
        '问题2': questions[1] || '',
        '导师反馈': r.advisor_feedback || '',
        '未咨询原因': !r.contacted_professor ? (r.not_contacted_reason || '') : '',
        '重填时间': formatDateTime(r.refill_resolved_at),
        '学生重填备注': r.refill_resolved_note || '',
      }
    })

    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(excelData)
    styleWorksheet(worksheet)
    XLSX.utils.book_append_sheet(workbook, worksheet, '重填名单')

    const active = filtered.filter((r: any) => !r.refill_resolved_at)
    const resolved = filtered.filter((r: any) => r.refill_resolved_at)

    if (active.length > 0) {
      const ws = XLSX.utils.json_to_sheet(
        active.map((r: any) => {
          const stu = studentMap.get(r.student_id)
          return {
            '学号': stu?.student_id || '',
            '姓名': stu?.name || '',
            '区队': stu?.squad || '',
            '导师': stu?.advisor || '',
            '周次': `第${r.week_number}周`,
            '标记时间': formatDateTime(r.refill_requested_at),
            '重填原因': r.refill_reason || '',
            '联系发起方': r.contacted_professor ? getInitiatorLabel(r.contact_initiator) : '',
          }
        })
      )
      ws['!cols'] = [
        { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
        { wch: 12 }, { wch: 18 }, { wch: 40 }, { wch: 10 },
      ]
      XLSX.utils.book_append_sheet(workbook, ws, '待重填')
    }

    if (resolved.length > 0) {
      const ws = XLSX.utils.json_to_sheet(
        resolved.map((r: any) => {
          const stu = studentMap.get(r.student_id)
          return {
            '学号': stu?.student_id || '',
            '姓名': stu?.name || '',
            '区队': stu?.squad || '',
            '导师': stu?.advisor || '',
            '周次': `第${r.week_number}周`,
            '标记时间': formatDateTime(r.refill_requested_at),
            '重填时间': formatDateTime(r.refill_resolved_at),
            '学生备注': r.refill_resolved_note || '',
          }
        })
      )
      ws['!cols'] = [
        { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
        { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 40 },
      ]
      XLSX.utils.book_append_sheet(workbook, ws, '已重填')
    }

    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx', bookSST: false })
    const weekPart = week ? `第${week}周` : '全部'
    const squadPart = squad ? `_${squad}` : ''
    const filename = `重填名单${squadPart}_${weekPart}.xlsx`

    return new NextResponse(new Uint8Array(excelBuffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    })
  } catch (error) {
    console.error('导出重填名单错误:', error)
    return NextResponse.json(
      { error: '导出失败' },
      { status: 500 }
    )
  }
}