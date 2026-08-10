// READ-ONLY investigation: which submissions are labeled week 25, and do they collide with week 24?
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const envContent = readFileSync(join(process.cwd(), '.env.local'), 'utf-8')
const env = {}
envContent.split('\n').forEach(line => {
  const [key, ...rest] = line.split('=')
  if (key && rest.length) env[key.trim()] = rest.join('=').trim()
})

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

const fmt = (iso) => new Date(iso).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })

const { data: w25, error: e25 } = await supabase
  .from('weekly_reports')
  .select('id, student_id, week_number, year, submitted_at, students(name, student_id, squad, advisor)')
  .eq('week_number', 25)
  .eq('year', 2026)
  .order('submitted_at', { ascending: true })

console.log('=== 第25周 (2026年) 记录 ===', `${(w25||[]).length} 条`)
;(w25 || []).forEach(r => {
  const s = r.students || {}
  console.log(`  - ${s.name} (${s.student_id}) [${s.squad}] 导师:${s.advisor} | 提交于 ${fmt(r.submitted_at)} | report.id=${r.id}`)
})

const { data: w24 } = await supabase
  .from('weekly_reports')
  .select('id, student_id, students(name, student_id)')
  .eq('week_number', 24)
  .eq('year', 2026)

const w24ByStudent = new Set((w24 || []).map(r => r.student_id))
console.log('\n=== 第24周 (2026年) 已有记录 ===', `${w24ByStudent.size} 条`)

console.log('\n=== 冲突检查：哪些第25周学生在第24周已有记录？ ===')
let conflict = 0
;(w25 || []).forEach(r => {
  if (w24ByStudent.has(r.student_id)) {
    const s = r.students || {}
    conflict++
    console.log(`  ⚠️ 冲突: ${s.name} (${s.student_id}) 在第24周和第25周都有记录`)
  }
})
if (conflict === 0) console.log('  无冲突')

// 周一截止边界（用于判断这些第25周提交是否"应该"属于第24周）
const { data: latest } = await supabase
  .from('weekly_reports')
  .select('submitted_at, week_number, year')
  .order('submitted_at', { ascending: false })
  .limit(5)
console.log('\n=== 最近5条提交（参考时间） ===')
;(latest || []).forEach(r => console.log(`  第${r.week_number}周(${r.year}) 提交于 ${fmt(r.submitted_at)}`))
