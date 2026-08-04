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

  console.log('检查是否可以恢复已删除的记录...\n')

  // 6个学生的ID
  const studentIds = [
    'b3b76175-b974-455f-9cb1-c89a3f02d516', // 吴羽祥
    '981c3c30-dbed-4d8a-b071-0d42beaf1093', // 范家炜
    '945431e0-d102-4d4b-99a6-fc517967c0b7', // 徐金伟
    '4d2da171-c7c9-407d-ac2c-4e57b5e70722', // 唐勘捷
    '24a92194-d5bd-4a91-8754-f354dd55365d', // 谈家涛
    '0f70d612-5b3d-4737-8b2b-8351072c9b67'  // 盛昀州
  ]

  // 检查归档表中是否有这些记录
  const { data: archivedReports, error } = await supabase
    .from('weekly_reports_archive')
    .select('*')
    .in('student_id', studentIds)
    .eq('week_number', 23)
    .eq('year', 2026)

  if (error) {
    console.log('归档表查询失败（可能不存在）:', error.message)
  } else {
    console.log(`归档表中找到 ${archivedReports?.length || 0} 条相关记录`)
    if (archivedReports && archivedReports.length > 0) {
      archivedReports.forEach(r => {
        console.log(`  - ${r.id}: 学生ID ${r.student_id}, 第 ${r.week_number} 周`)
      })
    }
  }

  // 检查是否有最近的备份
  console.log('\n⚠️ 记录已从主表删除，如果归档表中没有，需要学生重新提交')
  console.log('\n建议：通知以下6位同学重新提交第23周的周报：')

  const { data: students } = await supabase
    .from('students')
    .select('id, name, student_id, squad, advisor')
    .in('id', studentIds)

  students?.forEach(s => {
    console.log(`  - ${s.name} (${s.student_id}) - ${s.squad} - 导师：${s.advisor}`)
  })
}

main().catch(console.error)
