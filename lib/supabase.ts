import { createClient } from '@supabase/supabase-js'

// 公开的Supabase客户端（用于浏览器端）
export const createSupabaseClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// 服务端Supabase客户端（用于API路由）
export const createServiceClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// 数据库类型定义
export interface Student {
  id: string
  name: string
  student_id: string
  squad: string
  advisor: string
  created_at: string
}

export interface WeeklyReport {
  id: string
  student_id: string
  week_number: number
  year: number
  contacted_professor: boolean
  professor_replied: boolean | null
  reply_details: string | null
  signature: string | null
  submitted_at: string
}

export interface Admin {
  id: string
  username: string
  created_at: string
}
