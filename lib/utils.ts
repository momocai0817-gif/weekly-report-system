import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 北京时间固定为 UTC+8（中国不实行夏令时，自 1991 年起固定不变）。
// 这里用固定偏移而非 Intl，并全程只用 getUTC*/Date.UTC，确保计算与服务器宿主时区无关
// （无论服务器跑在 UTC 还是 Asia/Shanghai，结果都按北京时间一致）。
const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000

// 取绝对时刻 now 对应的「北京墙钟」各字段。原理：北京墙钟 = UTC + 8h，
// 故 now + 8h 后读取 UTC 字段即得北京墙钟的年/月/日/星期/时/分/秒/毫秒。
function getShanghaiParts(now: Date) {
  const s = new Date(now.getTime() + SHANGHAI_OFFSET_MS)
  return {
    year: s.getUTCFullYear(),
    month: s.getUTCMonth(), // 0-11
    date: s.getUTCDate(),
    weekday: s.getUTCDay(), // 0=周日 … 6=周六（按北京日历）
    hour: s.getUTCHours(),
    minute: s.getUTCMinutes(),
    second: s.getUTCSeconds(),
    ms: s.getUTCMilliseconds(),
  }
}

// 由北京墙钟各字段构造对应的绝对时刻（epoch ms）。Date.UTC 会自动归一化越界的日/月。
function shanghaiToEpoch(
  year: number, month: number, date: number,
  hour: number, minute: number, second: number, ms: number,
): number {
  return Date.UTC(year, month, date, hour, minute, second, ms) - SHANGHAI_OFFSET_MS
}

// 计算当前是第几周（基于学期开始日期）。
// 周的定义：北京时间 周一 23:59 → 下周一 23:59。
// 提交时间未过「本周一 23:59（北京时间）」截止点时，周报归属上一周；过了截止点则归属本周。
// 传入 now 以便服务端（提交接口）与客户端（页面展示）共用同一份逻辑，避免周次漂移。
export function getCurrentWeek(now: Date = new Date()): { weekNumber: number; year: number } {
  const deadline = process.env.WEEKLY_DEADLINE || 'Monday 23:59'
  const [dayName, time] = deadline.split(' ')
  const [dHour, dMinute] = time.split(':').map(Number)
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const targetWeekday = daysOfWeek.indexOf(dayName) // 周一 = 1

  const p = getShanghaiParts(now)

  // 本周（北京日历）目标日(周一)距离今天的天数：当天=0，次日=1，…，周日=6
  const daysSinceTarget = (p.weekday - targetWeekday + 7) % 7
  // 本周目标日（周一）的日期（可能 ≤0，跨月时由 Date.UTC 归一化）
  const mondayDate = p.date - daysSinceTarget

  // 本周截止时刻（绝对）：北京墙钟「本周一 hh:mm:59.999」
  const deadlineEpoch = shanghaiToEpoch(p.year, p.month, mondayDate, dHour, dMinute, 59, 999)

  // 周报归属的「锚点周一」（北京墙钟）：未过截止点 -> 上一周一；已过 -> 本周一
  const anchorDate = now.getTime() > deadlineEpoch ? mondayDate : mondayDate - 7
  const anchorEpoch = shanghaiToEpoch(p.year, p.month, anchorDate, 0, 0, 0, 0)
  const anchorYear = new Date(anchorEpoch + SHANGHAI_OFFSET_MS).getUTCFullYear()

  // 学期起点（按北京日历解析 'YYYY-MM-DD'）
  const startDateStr = process.env.SEMESTER_START_DATE || '2025-02-24'
  const [sYear, sMonth, sDate] = startDateStr.split('-').map(Number)
  // 某年学期起点所在周的周一（北京墙钟 00:00 的绝对时刻）
  const semesterStartEpoch = (year: number) => {
    const wd = new Date(Date.UTC(year, sMonth - 1, sDate)).getUTCDay()
    const daysToMonday = (wd - 1 + 7) % 7
    return shanghaiToEpoch(year, sMonth - 1, sDate - daysToMonday, 0, 0, 0, 0)
  }

  // 取不晚于锚点周一的最近一个学期起点；若本年学期起点晚于锚点，则回退到上一年
  let startEpoch = semesterStartEpoch(anchorYear)
  if (startEpoch > anchorEpoch) {
    startEpoch = semesterStartEpoch(anchorYear - 1)
  }

  const dayMs = 24 * 60 * 60 * 1000
  const diffDays = Math.round((anchorEpoch - startEpoch) / dayMs)
  const weekNumber = Math.floor(diffDays / 7) + 1

  return { weekNumber, year: anchorYear }
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

// 格式化日期时间（严格按北京时间）
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  // 使用北京时间（UTC+8）格式化
  const chinaTime = new Date(d.getTime() + SHANGHAI_OFFSET_MS)
  return chinaTime.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Shanghai'
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
  const deadline = process.env.WEEKLY_DEADLINE || 'Monday 23:59'
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
