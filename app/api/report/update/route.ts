import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: '缺少报告ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { contacted_professor, professor_replied, reply_details } = body

    const supabase = createServiceClient()

    // 检查报告是否存在
    const { data: existing } = await supabase
      .from('weekly_reports')
      .select('*')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { error: '报告不存在' },
        { status: 404 }
      )
    }

    // 更新报告
    const { data, error } = await supabase
      .from('weekly_reports')
      .update({
        contacted_professor,
        professor_replied: contacted_professor ? professor_replied : null,
        reply_details: contacted_professor ? reply_details : null,
        submitted_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('更新错误:', error)
      return NextResponse.json(
        { error: '更新失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      report: data,
    })
  } catch (error) {
    console.error('更新错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
