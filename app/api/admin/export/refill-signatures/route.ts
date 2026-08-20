import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import JSZip from 'jszip'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const week = searchParams.get('week')
    const year = searchParams.get('year')

    const supabase = createServiceClient()

    const { data: reports, error } = await supabase
      .from('weekly_reports')
      .select('*')

    if (error) {
      console.error('查询重填记录错误:', error)
      return NextResponse.json({ error: '查询失败' }, { status: 500 })
    }

    let filtered = (reports || []).filter((r: any) => !!r.refill_resolved_at)
    if (week) filtered = filtered.filter((r: any) => r.week_number === parseInt(week))
    if (year) filtered = filtered.filter((r: any) => r.year === parseInt(year))

    if (filtered.length === 0) {
      return NextResponse.json({ error: '暂无重填记录' }, { status: 404 })
    }

    const studentIds = Array.from(new Set(filtered.map((r: any) => r.student_id)))
    const studentMap = new Map<string, any>()
    const { data: students } = await supabase
      .from('students')
      .select('id, name, student_id, squad, advisor')
      .in('id', studentIds as string[])
    ;(students || []).forEach((s: any) => studentMap.set(s.id, s))

    const zip = new JSZip()
    const squad1Folder = zip.folder('一区队')
    const squad2Folder = zip.folder('二区队')

    filtered.forEach((report: any) => {
      const student = studentMap.get(report.student_id)
      if (!student || !report.signature) return
      const filename = `${student.name}_${student.student_id}.png`
      const base64Data = report.signature.replace(/^data:image\/\w+;base64,/, '')
      const buffer = Buffer.from(base64Data, 'base64')
      if (student.squad === '一区队') squad1Folder?.file(filename, buffer)
      else if (student.squad === '二区队') squad2Folder?.file(filename, buffer)
    })

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })
    const weekPart = week ? `第${week}周` : '全部'
    const filename = `重填周报_签名_${weekPart}.zip`

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    })
  } catch (error) {
    console.error('导出重填签名失败:', error)
    return NextResponse.json({ error: '导出失败' }, { status: 500 })
  }
}
