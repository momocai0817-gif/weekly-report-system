import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

// 加载环境变量
const envPath = join(process.cwd(), '.env.local')
const envContent = readFileSync(envPath, 'utf-8')
const envVars: Record<string, string> = {}

envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim()
  }
})

async function main() {
  const supabase = createClient(
    envVars.NEXT_PUBLIC_SUPABASE_URL!,
    envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  console.log('检查Supabase数据库...\n')

  // 检查是否有其他可以恢复的表或视图
  const { data: tables, error } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')

  if (error) {
    console.log('无法查询表列表:', error.message)
  } else {
    console.log('数据库中的表:')
    tables?.forEach((t: any) => {
      console.log(`  - ${t.table_name}`)
    })
  }

  // 检查当前的weekly_reports表
  const { data: allReports, error: reportError } = await supabase
    .from('weekly_reports')
    .select('*')
    .order('submitted_at', { ascending: false })
    .limit(10)

  console.log(`\n最近的10条周报记录:`)
  allReports?.forEach(r => {
    console.log(`  - ID: ${r.id.substring(0, 8)}... | 学生: ${r.student_id.substring(0, 8)}... | 第${r.week_number}周 | 提交: ${new Date(r.submitted_at).toLocaleString('zh-CN')}`)
  })

  console.log('\n⚠️ 被删除的记录无法通过普通SQL查询恢复。')
  console.log('如需恢复，请检查：')
  console.log('1. Supabase仪表板 > Database > Backups（需要Pro计划）')
  console.log('2. Supabase仪表板 > Database > Logs（查看删除操作的审计日志）')
}

main().catch(console.error)
