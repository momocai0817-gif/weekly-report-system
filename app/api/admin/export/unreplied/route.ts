import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import * as XLSX from 'xlsx'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const week = searchParams.get('week')
    const year = searchParams.get('year')

    // 构建内部请求URL
    const baseUrl = request.nextUrl.origin
    const unrepliedUrl = new URL('/api/admin/unreplied', baseUrl)
    if (week) unrepliedUrl.searchParams.set('week', week)
    if (year) unrepliedUrl.searchParams.set('year', year)

    // 获取未回复数据
    const unrepliedResponse = await fetch(unrepliedUrl.toString())
    const unrepliedData = await unrepliedResponse.json()

    if (!unrepliedResponse.ok) {
      throw new Error(unrepliedData.error || '获取数据失败')
    }

    const { cases, summary } = unrepliedData

    if (cases.length === 0) {
      return NextResponse.json(
        { error: '暂无连续两周未回复的情况' },
        { status: 404 }
      )
    }

    // 生成总表数据
    const excelData = cases.map((item: any) => ({
      '学号': item.student.student_id,
      '姓名': item.student.name,
      '区队': item.student.squad,
      '导师': item.student.advisor,
      '问题周次': `第${item.previousWeek}周-第${item.currentWeek}周`,
      '年份': `${item.previousYear}-${item.currentYear}`,
      '情况说明': '连续两周学生咨询导师但导师未回复',
    }))

    // 按导师分组
    const advisorGroups = new Map<string, any[]>()
    cases.forEach((item: any) => {
      const advisor = item.student.advisor || '未分配导师'
      if (!advisorGroups.has(advisor)) {
        advisorGroups.set(advisor, [])
      }
      advisorGroups.get(advisor)!.push({
        '学号': item.student.student_id,
        '姓名': item.student.name,
        '区队': item.student.squad,
        '导师': advisor,
        '问题周次': `第${item.previousWeek}周-第${item.currentWeek}周`,
      })
    })

    // 创建工作簿
    const workbook = XLSX.utils.book_new()

    // 添加总表
    const worksheet = XLSX.utils.json_to_sheet(excelData)
    XLSX.utils.book_append_sheet(workbook, worksheet, '未回复总表')

    // 按导师分组添加sheet
    const sortedAdvisors = Array.from(advisorGroups.keys()).sort((a, b) =>
      a.localeCompare(b, 'zh-CN')
    )
    sortedAdvisors.forEach((advisor) => {
      const advisorData = advisorGroups.get(advisor)!
      // sheet名称不能超过31个字符
      const sheetName = advisor.length > 26 ? advisor.substring(0, 26) : advisor
      const advisorWorksheet = XLSX.utils.json_to_sheet(advisorData)
      XLSX.utils.book_append_sheet(workbook, advisorWorksheet, sheetName)
    })

    // 生成Excel文件
    const excelBuffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
      bookSST: false,
    })

    const filename = `导师未回复检测_第${summary.currentWeek}周.xlsx`

    return new NextResponse(new Uint8Array(excelBuffer), {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    })
  } catch (error) {
    console.error('导出失败:', error)
    return NextResponse.json({ error: '导出失败' }, { status: 500 })
  }
}
