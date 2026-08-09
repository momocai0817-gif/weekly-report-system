import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { type, ...credentials } = body

  // 记录接收到的数据
  console.log('DEBUG - Login request:', { type, credentials })

  const supabase = createServiceClient()

  if (type === 'student') {
    const { name, studentId } = credentials

    // 查询数据库
    const { data: student, error } = await supabase
      .from('students')
      .select('*')
      .eq('name', name?.trim())
      .eq('student_id', studentId?.trim())
      .single()

    console.log('DEBUG - Query result:', { error: error?.message, studentName: student?.name })

    return NextResponse.json({
      received: { name, studentId },
      dbResult: { error: error?.message, found: !!student, studentName: student?.name }
    })
  }

  return NextResponse.json({ message: 'debug endpoint' })
}
