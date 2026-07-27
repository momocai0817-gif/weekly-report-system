import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// 获取上一周的周次和年份
function getPreviousWeek(): { weekNumber: number; year: number } {
  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  const startDate = new Date(process.env.SEMESTER_START_DATE || '2025-02-24')
  const year = yesterday.getFullYear()
  const startDateThisYear = new Date(year, startDate.getMonth(), startDate.getDate())

  const actualStartDate = yesterday < startDateThisYear
    ? new Date(year - 1, startDate.getMonth(), startDate.getDate())
    : startDateThisYear

  const diffTime = yesterday.getTime() - actualStartDate.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  const weekNumber = Math.floor(diffDays / 7) + 1

  return { weekNumber, year }
}

// 验证 Cron 请求（Vercel Cron 验证）
function isValidCronRequest(request: NextRequest): boolean {
  // Vercel Cron 会发送一个特定的验证请求
  // 实际生产中应该使用更严格的验证方式，如 API 密钥
  const authHeader = request.headers.get('authorization')
  const cronKey = process.env.CRON_SECRET_KEY

  if (cronKey) {
    return authHeader === `Bearer ${cronKey}`
  }

  // 如果没有设置密钥，在生产环境应该拒绝
  // 但为了测试，允许所有请求
  return true
}

export async function GET(request: NextRequest) {
  try {
    // 验证请求
    if (!isValidCronRequest(request)) {
      return NextResponse.json(
        { error: '未授权的请求' },
        { status: 401 }
      )
    }

    console.log('开始执行定时归档任务...')

    const previousWeek = getPreviousWeek()
    console.log(`准备归档第${previousWeek.weekNumber}周(${previousWeek.year}年)`)

    const supabase = createServiceClient()

    // 检查归档是否已存在
    const { data: existingArchive, error: checkError } = await supabase
      .from('weekly_archives')
      .select('id, created_at')
      .eq('week_number', previousWeek.weekNumber)
      .eq('year', previousWeek.year)
      .single()

    if (!checkError && existingArchive) {
      console.log('归档已存在，跳过生成')
      return NextResponse.json({
        message: '归档已存在，无需重复生成',
        week: previousWeek.weekNumber,
        year: previousWeek.year,
        existing: true,
        created_at: existingArchive.created_at,
      })
    }

    // 调用归档生成API
    // 由于这是内部调用，我们直接在这里生成归档
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin
    const generateUrl = `${baseUrl}/api/admin/archive/generate?week=${previousWeek.weekNumber}&year=${previousWeek.year}`

    console.log('调用归档生成API:', generateUrl)

    const response = await fetch(generateUrl, {
      method: 'GET',
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || '归档生成失败')
    }

    const result = await response.json()

    console.log('定时归档任务完成:', result)

    return NextResponse.json({
      message: '定时归档任务完成',
      week: previousWeek.weekNumber,
      year: previousWeek.year,
      archive: result.archive,
    })
  } catch (error: any) {
    console.error('定时归档任务失败:', error)
    return NextResponse.json(
      { error: error.message || '定时归档任务失败' },
      { status: 500 }
    )
  }
}

// 同时支持 POST 请求（用于手动触发）
export async function POST(request: NextRequest) {
  return GET(request)
}
