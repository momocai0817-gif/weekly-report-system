import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient()

    const backup: any = {
      timestamp: new Date().toISOString(),
      students: [],
      weekly_reports: [],
      admins: []
    }

    // 备份学生表
    const { data: students } = await supabase
      .from('students')
      .select('*')
      .order('name')
    backup.students = students || []

    // 备份周报表
    const { data: reports } = await supabase
      .from('weekly_reports')
      .select('*, students(name, student_id, squad, advisor)')
      .order('submitted_at', { ascending: true })
    backup.weekly_reports = reports || []

    // 备份管理员表
    const { data: admins } = await supabase
      .from('admins')
      .select('*')
    backup.admins = admins || []

    return NextResponse.json({
      success: true,
      backup,
      stats: {
        students: backup.students.length,
        reports: backup.weekly_reports.length,
        admins: backup.admins.length
      }
    })
  } catch (error: any) {
    console.error('备份失败:', error)
    return NextResponse.json(
      { error: '备份失败', details: error.message },
      { status: 500 }
    )
  }
}
