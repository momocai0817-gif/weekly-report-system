import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import JSZip from 'jszip'

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
    let reportsQuery = supabase
      .from('weekly_reports')
      .select('*')
      .eq('week_number', parseInt(week))
      .eq('year', parseInt(year))

    const { data: reports, error: reportsError } = await reportsQuery.order('submitted_at', { ascending: true })

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

    // 添加签名图片到对应文件夹
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
      ? `${squad}_签名_第${week}周.zip`
      : `签名_第${week}周.zip`

    return new NextResponse(zipBuffer, {
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
