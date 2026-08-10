// 验证 getCurrentWeek 严格按北京时间计算，且与宿主时区无关。
import { getCurrentWeek } from '../lib/utils.ts'

// 与生产保持一致
process.env.SEMESTER_START_DATE = '2026-02-23'
process.env.WEEKLY_DEADLINE = 'Monday 23:59'

// 由「北京墙钟」构造绝对时刻
const bj = (y, mo, d, h = 0, mi = 0, s = 0, ms = 0) =>
  Date.UTC(y, mo - 1, d, h, mi, s, ms) - 8 * 3600 * 1000

const cases = [
  ['2026-08-10 09:32:05  周一 截止前（周令翀场景）', bj(2026, 8, 10, 9, 32, 5), 24],
  ['2026-08-10 23:58:00  周一 截止前', bj(2026, 8, 10, 23, 58, 0), 24],
  ['2026-08-10 23:59:59.500  周一 临界内', bj(2026, 8, 10, 23, 59, 59, 500), 24],
  ['2026-08-11 00:00:05  周二 刚过截止', bj(2026, 8, 11, 0, 0, 5), 25],
  ['2026-08-05 12:00  周三', bj(2026, 8, 5, 12, 0), 24],
  ['2026-08-09 23:21  周日', bj(2026, 8, 9, 23, 21), 24],
  ['2026-08-17 23:58  下周一 截止前', bj(2026, 8, 17, 23, 58), 25],
  ['2026-08-18 00:30  下周二', bj(2026, 8, 18, 0, 30), 26],
  ['2026-02-24 10:00  学期第1周 周二', bj(2026, 2, 24, 10, 0), 1],
  ['2026-03-02 23:58  第1周截止前', bj(2026, 3, 2, 23, 58), 1],
  ['2026-03-03 00:30  进入第2周', bj(2026, 3, 3, 0, 30), 2],
]

let pass = 0
for (const [label, epoch, expected] of cases) {
  const got = getCurrentWeek(new Date(epoch)).weekNumber
  const ok = got === expected
  if (ok) pass++
  console.log(`${ok ? '✅' : '❌'} ${label} => 第${got}周 (期望 第${expected}周)`)
}
console.log(`\n宿主时区 TZ=${process.env.TZ || '(系统默认)'}  →  ${pass}/${cases.length} 通过`)
if (pass !== cases.length) process.exit(1)
