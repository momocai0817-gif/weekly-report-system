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

export interface ReportFormData {
  contacted_professor: boolean
  professor_replied: boolean | null
  reply_details: string
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
}

export interface Student {
  id: string
  name: string
  student_id: string
  squad: string
  advisor: string
  created_at: string
}
