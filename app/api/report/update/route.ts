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
    const { contacted_professor, professor_replied, reply_details, signature, not_contacted_reason } = body

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

    // 构建更新数据对象
    const updateData: any = {
      contacted_professor,
      professor_replied: contacted_professor ? professor_replied : null,
      reply_details: contacted_professor ? reply_details : null,
      signature: signature || null,
      submitted_at: new Date().toISOString(),
    }

    // 添加 not_contacted_reason 字段（向后兼容）
    if (not_contacted_reason !== undefined) {
      updateData.not_contacted_reason = !contacted_professor ? not_contacted_reason : null
    }

    // 执行更新（不返回数据）
    const { error } = await supabase
      .from('weekly_reports')
      .update(updateData)
      .eq('id', id)

    if (error) {
      // 如果错误是因为 not_contacted_reason 字段不存在，则重试不包含该字段
      if (error.message && error.message.includes('not_contacted_reason')) {
        const { not_contacted_reason: _, ...updateDataRetry } = updateData
        const retryResult = await supabase
          .from('weekly_reports')
          .update(updateDataRetry)
          .eq('id', id')

        if (retryResult.error) {
          console.error('更新错误:', retryResult.error)
          return NextResponse.json(
            { error: '更新失败' },
            { status: 500 }
          )
        }
      } else {
        console.error('更新错误:', error)
        return NextResponse.json(
          { error: '更新失败' },
          { status: 500 }
        )
      }
    }

    // 获取更新后的数据
    const { data: updatedReport } = await supabase
      .from('weekly_reports')
      .select('*')
      .eq('id', id)
      .single()

    return NextResponse.json({
      success: true,
      report: updatedReport,
    })
  } catch (error) {
    console.error('更新错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
