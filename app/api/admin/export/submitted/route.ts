import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import JSZip from 'jszip'
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

    // 获取本周所有周报
    const { data: reports, error: reportsError } = await supabase
      .from('weekly_reports')
      .select('*')
      .eq('week_number', parseInt(week))
      .eq('year', parseInt(year))

    if (reportsError) {
      console.error('查询周报错误:', reportsError)
      throw reportsError
    }

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

    // 创建ZIP文件
    const zip = new JSZip()

    // 按区队分组
    const squad1Folder = zip.folder('一区队')
    const squad2Folder = zip.folder('二区队')

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
    const worksheet = XLSX.utils.json_to_sheet(excelData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '已交名单')

    // 生成Excel文件
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx', bookSST: false })

    // 将Excel添加到ZIP根目录
    const excelFilename = squad
      ? `${squad}_已交名单_第${week}周.xlsx`
      : `已交名单_第${week}周.xlsx`

    zip.file(excelFilename, excelBuffer)

    // 添加签名图片到对应区队文件夹
    reports.forEach(report => {
      const student = studentMap.get(report.student_id)
      if (!student || !report.signature) return

      // 过滤区队
      if (squad && student.squad !== squad) return

      // 文件名：姓名_学号.png
      const filename = `${student.name}_${student.student_id}.png`

      // 将base64转换为二进制数据
      const base64Data = report.signature.replace(/^data:image\/\w+;base64,/, '')
      const buffer = Buffer.from(base64Data, 'base64')

      // 添加到对应区队文件夹
      if (student.squad === '一区队') {
        squad1Folder?.file(filename, buffer)
      } else if (student.squad === '二区队') {
        squad2Folder?.file(filename, buffer)
      }
    })

    // 生成ZIP文件
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })

    // 根据区队生成文件名
    const filename = squad
      ? `${squad}_已交名单_第${week}周.zip`
      : `已交名单_第${week}周.zip`

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        'Content-Type': 'application/zip',
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
