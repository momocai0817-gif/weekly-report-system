import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const studentId = searchParams.get('studentId')
    const week = searchParams.get('week')
    const year = searchParams.get('year')

    if (!studentId || !week || !year) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    const { data: report, error } = await supabase
      .from('weekly_reports')
      .select('*')
      .eq('student_id', studentId)
      .eq('week_number', parseInt(week))
      .eq('year', parseInt(year))
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 表示没有找到记录
      console.error('查询错误:', error)
      return NextResponse.json(
        { error: '查询失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      report: report || null,
    })
  } catch (error) {
    console.error('查询错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
