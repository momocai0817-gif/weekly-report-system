import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

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

    const { data: reports, error } = await supabase
      .from('weekly_reports')
      .select(`
        *,
        student:students!inner (
          name,
          student_id,
          squad,
          advisor
        )
      `)
      .eq('week_number', parseInt(week))
      .eq('year', parseInt(year))
      .order('submitted_at', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ reports: reports || [] })
  } catch (error) {
    console.error('获取周报失败:', error)
    return NextResponse.json(
      { error: '获取周报失败' },
      { status: 500 }
    )
  }
}
