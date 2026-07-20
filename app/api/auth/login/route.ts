import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, ...credentials } = body

    const supabase = createServiceClient()

    if (type === 'student') {
      // 学生登录：姓名+学号白名单验证
      const { name, studentId } = credentials

      if (!name || !studentId) {
        return NextResponse.json(
          { error: '请提供姓名和学号' },
          { status: 400 }
        )
      }

      const { data: student, error } = await supabase
        .from('students')
        .select('*')
        .eq('name', name.trim())
        .eq('student_id', studentId.trim())
        .single()

      if (error || !student) {
        return NextResponse.json(
          { error: '姓名或学号不正确，请联系管理员确认' },
          { status: 401 }
        )
      }

      return NextResponse.json({
        user: {
          id: student.id,
          name: student.name,
          role: 'student' as const,
          studentId: student.student_id,
          squad: student.squad,
          advisor: student.advisor,
        },
      })
    } else if (type === 'admin') {
      // 管理员登录：用户名+密码
      const { username, password } = credentials

      if (!username || !password) {
        return NextResponse.json(
          { error: '请提供用户名和密码' },
          { status: 400 }
        )
      }

      // 从环境变量获取管理员凭证
      const adminUsername = process.env.ADMIN_USERNAME || 'admin'
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'

      if (username !== adminUsername || password !== adminPassword) {
        return NextResponse.json(
          { error: '用户名或密码错误' },
          { status: 401 }
        )
      }

      return NextResponse.json({
        user: {
          id: 'admin',
          name: '管理员',
          role: 'admin' as const,
        },
      })
    } else {
      return NextResponse.json(
        { error: '无效的登录类型' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('登录错误:', error)
    return NextResponse.json(
      { error: '服务器错误，请稍后重试' },
      { status: 500 }
    )
  }
}
