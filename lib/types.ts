// 数据库表类型定义
export interface Database {
  public: {
    Tables: {
      students: {
        Row: {
          id: string
          name: string
          student_id: string
          squad: string
          advisor: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          student_id: string
          squad: string
          advisor: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          student_id?: string
          squad?: string
          advisor?: string
          created_at?: string
        }
      }
      weekly_reports: {
        Row: {
          id: string
          student_id: string
          week_number: number
          year: number
          contacted_professor: boolean
          professor_replied: boolean | null
          reply_details: string | null
          screenshot_urls: string[] | null
          submitted_at: string
          // 联系发起方：student=学生主动联系老师 / teacher=老师主动联系学生
          contact_initiator: 'student' | 'teacher' | null
          // 重填管理
          needs_refill: boolean
          refill_requested_at: string | null
          refill_reason: string | null
          refill_resolved_at: string | null
          refill_resolved_note: string | null
        }
        Insert: {
          id?: string
          student_id: string
          week_number: number
          year: number
          contacted_professor: boolean
          professor_replied?: boolean | null
          reply_details?: string | null
          screenshot_urls?: string[] | null
          submitted_at?: string
          contact_initiator?: 'student' | 'teacher' | null
          needs_refill?: boolean
          refill_requested_at?: string | null
          refill_reason?: string | null
          refill_resolved_at?: string | null
          refill_resolved_note?: string | null
        }
        Update: {
          id?: string
          student_id?: string
          week_number?: number
          year?: number
          contacted_professor?: boolean
          professor_replied?: boolean | null
          reply_details?: string | null
          screenshot_urls?: string[] | null
          submitted_at?: string
          contact_initiator?: 'student' | 'teacher' | null
          needs_refill?: boolean
          refill_requested_at?: string | null
          refill_reason?: string | null
          refill_resolved_at?: string | null
          refill_resolved_note?: string | null
        }
      }
      admins: {
        Row: {
          id: string
          username: string
          password_hash: string
          created_at: string
        }
        Insert: {
          id?: string
          username: string
          password_hash: string
          created_at?: string
        }
        Update: {
          id?: string
          username?: string
          password_hash?: string
          created_at?: string
        }
      }
    }
  }
}

// 应用类型定义
export interface User {
  id: string
  name: string
  role: 'student' | 'admin'
  studentId?: string
  squad?: string
  advisor?: string
}

// 联系发起方的取值
export type ContactInitiator = 'student' | 'teacher'

export interface ReportFormData {
  contacted_professor: boolean
  // 仅当 contacted_professor = true 时有效
  contact_initiator?: ContactInitiator | null
  professor_replied: boolean | null
  reply_details: string
  not_contacted_reason?: string
  preparation_work?: string
  question_list?: string
  advisor_feedback?: string
  // 重填相关
  refill_resolved_note?: string
}

export interface ReportWithStudent extends WeeklyReport {
  student: {
    name: string
    student_id: string
    squad: string
    advisor: string
  }
}

export interface WeeklyReport {
  id: string
  student_id: string
  week_number: number
  year: number
  contacted_professor: boolean
  professor_replied: boolean | null
  reply_details: string | null
  screenshot_urls: string[] | null
  submitted_at: string
  contact_initiator: ContactInitiator | null
  needs_refill: boolean
  refill_requested_at: string | null
  refill_reason: string | null
  refill_resolved_at: string | null
  refill_resolved_note: string | null
}

export interface Student {
  id: string
  name: string
  student_id: string
  squad: string
  advisor: string
  created_at: string
}

// 联系发起方对应的展示文本
export const CONTACT_INITIATOR_LABELS: Record<ContactInitiator, string> = {
  student: '我主动联系老师',
  teacher: '老师主动联系我',
}