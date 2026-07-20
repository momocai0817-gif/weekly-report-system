import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// GET - 获取所有学生
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient()

    const { data: students, error } = await supabase
      .from('students')
      .select('*')
      .order('squad', { ascending: true })
      .order('student_id', { ascending: true })

    if (error) {
      throw error
    }

    return NextResponse.json({ students: students || [] })
  } catch (error) {
    console.error('获取学生列表失败:', error)
    return NextResponse.json(
      { error: '获取学生列表失败' },
      { status: 500 }
    )
  }
}

// POST - 添加学生
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, student_id, squad, advisor } = body

    if (!name || !student_id || !squad || !advisor) {
      return NextResponse.json(
        { error: '请填写完整信息' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('students')
      .insert({
        name: name.trim(),
        student_id: student_id.trim(),
        squad,
        advisor: advisor.trim(),
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: '该学号已存在' },
          { status: 409 }
        )
      }
      throw error
    }

    return NextResponse.json({ success: true, student: data })
  } catch (error) {
    console.error('添加学生失败:', error)
    return NextResponse.json(
      { error: '添加学生失败' },
      { status: 500 }
    )
  }
}

// PUT - 更新学生
export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: '缺少学生ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { name, student_id, squad, advisor } = body

    if (!name || !student_id || !squad || !advisor) {
      return NextResponse.json(
        { error: '请填写完整信息' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('students')
      .update({
        name: name.trim(),
        student_id: student_id.trim(),
        squad,
        advisor: advisor.trim(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: '该学号已存在' },
          { status: 409 }
        )
      }
      throw error
    }

    return NextResponse.json({ success: true, student: data })
  } catch (error) {
    console.error('更新学生失败:', error)
    return NextResponse.json(
      { error: '更新学生失败' },
      { status: 500 }
    )
  }
}

// DELETE - 删除学生
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: '缺少学生ID' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('删除学生失败:', error)
    return NextResponse.json(
      { error: '删除学生失败' },
      { status: 500 }
    )
  }
}
