import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 计算当前是第几周（基于学期开始日期）
export function getCurrentWeek(): { weekNumber: number; year: number } {
  const startDate = new Date(process.env.SEMESTER_START_DATE || '2025-02-24')
  const now = new Date()

  const year = now.getFullYear()
  const startOfYear = new Date(year, 0, 1)
  const startDateThisYear = new Date(year, startDate.getMonth(), startDate.getDate())

  // 如果当前日期在本学期开始之前，使用去年的学期开始日期
  const actualStartDate = now < startDateThisYear
    ? new Date(year - 1, startDate.getMonth(), startDate.getDate())
    : startDateThisYear

  const diffTime = now.getTime() - actualStartDate.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  const weekNumber = Math.floor(diffDays / 7) + 1

  return { weekNumber, year }
}

// 格式化日期
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

// 格式化日期时间
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// 获取本周开始和结束日期
export function getWeekRange(weekNumber: number, year: number): { start: Date; end: Date } {
  const startDate = new Date(process.env.SEMESTER_START_DATE || '2025-02-24')
  const startOfYear = new Date(year, 0, 1)

  // 计算本周的开始日期
  const weekStart = new Date(year, startDate.getMonth(), startDate.getDate())
  weekStart.setDate(weekStart.getDate() + (weekNumber - 1) * 7)

  // 本周结束日期（周日）
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  return { start: weekStart, end: weekEnd }
}

// 检查是否已过截止时间
export function isPastDeadline(): boolean {
  const deadline = process.env.WEEKLY_DEADLINE || 'Sunday 23:59'
  const now = new Date()

  // 解析截止时间
  const [day, time] = deadline.split(' ')
  const [hour, minute] = time.split(':').map(Number)

  const deadlineDate = new Date(now)
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const targetDay = daysOfWeek.indexOf(day)

  const currentDay = now.getDay()
  const daysUntilTarget = (targetDay - currentDay + 7) % 7

  deadlineDate.setDate(now.getDate() + daysUntilTarget)
  deadlineDate.setHours(hour, minute, 0, 0)

  // 如果截止时间已过，设置为下周的截止时间
  if (now > deadlineDate && daysUntilTarget !== 0) {
    deadlineDate.setDate(deadlineDate.getDate() + 7)
  }

  return now > deadlineDate
}

// 生成未交名单文本
export function generateUnsubmittedList(students: Array<{ name: string; student_id: string; squad: string; advisor: string }>): string {
  const squad1 = students.filter(s => s.squad === '一区队')
  const squad2 = students.filter(s => s.squad === '二区队')

  let text = `【本周未交周报名单】（共${students.length}人）\n\n`

  if (squad1.length > 0) {
    text += `一区队：\n`
    squad1.forEach(s => {
      text += `- ${s.name} (${s.student_id}) - 导师：${s.advisor}\n`
    })
    text += '\n'
  }

  if (squad2.length > 0) {
    text += `二区队：\n`
    squad2.forEach(s => {
      text += `- ${s.name} (${s.student_id}) - 导师：${s.advisor}\n`
    })
  }

  text += '\n请以上同学尽快完成周报填写！'

  return text
}

// 复制文本到剪贴板
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (err) {
    // 降级方案
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    try {
      document.execCommand('copy')
      return true
    } catch (e) {
      return false
    } finally {
      document.body.removeChild(textarea)
    }
  }
}
