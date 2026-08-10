// 把被错误归到第25周的提交移回第24周。
// 根因：submit 路由旧逻辑用「本周一」算周次，周一(北京时间截止点前)提交会被记到下一周。
// 规则（与 lib/utils.ts getCurrentWeek 一致）：周 = 北京时间 周一23:59 → 下周一23:59。
// 直接复用 lib/utils.ts 的 getCurrentWeek，避免逻辑漂移。默认 DRY-RUN，加 --apply 才写库。
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'
import { getCurrentWeek } from '../lib/utils.ts'

const APPLY = process.argv.includes('--apply')
const envContent = readFileSync(join(process.cwd(), '.env.local'), 'utf-8')
const env = {}
envContent.split('\n').forEach(line => {
  const [key, ...rest] = line.split('=')
  if (key && rest.length) env[key.trim()] = rest.join('=').trim()
})

// getCurrentWeek 在调用时读取这两个环境变量
process.env.SEMESTER_START_DATE = env.SEMESTER_START_DATE || '2026-02-23'
process.env.WEEKLY_DEADLINE = env.WEEKLY_DEADLINE || 'Monday 23:59'

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const fmt = (iso) => new Date(iso).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })

const { data: w25, error } = await supabase
  .from('weekly_reports')
  .select('*, students(name, student_id, squad, advisor)')
  .eq('week_number', 25)
  .eq('year', 2026)
  .order('submitted_at', { ascending: true })
if (error) { console.error('查询失败:', error); process.exit(1) }

console.log(`模式: ${APPLY ? '⚡ APPLY (写库)' : '🔍 DRY-RUN (不写库，加 --apply 真正执行)'}`)
console.log(`第25周(2026)记录: ${(w25 || []).length} 条\n`)

let moved = 0, skipped = 0
for (const r of w25 || []) {
  const correct = getCurrentWeek(new Date(r.submitted_at))
  const s = r.students || {}
  console.log(`--- ${s.name} (${s.student_id}) [${s.squad}] 导师:${s.advisor} ---`)
  console.log(`  提交于 ${fmt(r.submitted_at)} (北京时间)`)
  console.log(`  当前: 第${r.week_number}周 → 正确: 第${correct.weekNumber}周 (${correct.year}年)`)

  if (correct.weekNumber === r.week_number && correct.year === r.year) {
    console.log('  ✓ 周次已正确，跳过\n'); skipped++; continue
  }

  const { data: clash } = await supabase
    .from('weekly_reports')
    .select('id')
    .eq('student_id', r.student_id)
    .eq('week_number', correct.weekNumber)
    .eq('year', correct.year)
  if (clash && clash.length) {
    console.log(`  ⚠️ 目标第${correct.weekNumber}周已存在记录(id=${clash[0].id})，跳过避免覆盖\n`); skipped++; continue
  }

  console.log(`  原始记录(回滚用): ${JSON.stringify({ id: r.id, student_id: r.student_id, week_number: r.week_number, year: r.year })}`)
  if (APPLY) {
    const { error: ue } = await supabase
      .from('weekly_reports')
      .update({ week_number: correct.weekNumber, year: correct.year })
      .eq('id', r.id)
    if (ue) { console.log(`  ❌ 更新失败: ${ue.message}\n`); skipped++; continue }
    const { data: after } = await supabase.from('weekly_reports').select('week_number, year').eq('id', r.id).single()
    console.log(`  ✅ 已迁移 → 第${after.week_number}周 (${after.year}年)\n`); moved++
  } else {
    console.log(`  → DRY-RUN：将更新为 第${correct.weekNumber}周\n`)
  }
}

console.log(`完成。${APPLY ? `迁移 ${moved} 条` : `(试运行) 预计迁移 ${(w25?.length || 0) - skipped} 条`}, 跳过 ${skipped} 条。`)
