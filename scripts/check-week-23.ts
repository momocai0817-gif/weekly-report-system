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

  console.log('检查第23周的提交情况...\n')

  // 查询第23周的所有记录
  const { data: week23, error } = await supabase
    .from('weekly_reports')
    .select('*, students(name, student_id, squad, advisor)')
    .eq('week_number', 23)
    .eq('year', 2026)

  if (error) {
    console.error('查询失败:', error)
    return
  }

  console.log(`第23周共有 ${week23?.length || 0} 条记录\n`)

  // 查询所有学生
  const { data: allStudents } = await supabase
    .from('students')
    .select('id, name, student_id, squad, advisor')
    .order('squad', { ascending: true })

  console.log(`系统共有 ${allStudents?.length || 0} 名学生\n`)

  // 找出第23周未提交的学生
  const submittedIds = new Set(week23?.map(r => r.student_id) || [])
  const unsubmitted = allStudents?.filter(s => !submittedIds.has(s.id)) || []

  console.log(`第23周未提交的学生 (${unsubmitted.length}人):`)
  unsubmitted.forEach(s => {
    console.log(`  - ${s.name} (${s.student_id}) - ${s.squad} - 导师：${s.advisor}`)
  })

  // 检查这6个人周一提交的记录
  console.log('\n--- 检查周一提交的6个人在第23周的情况 ---')

  const mondayIds = [
    'b3b76175-b974-455f-9cb1-c89a3f02d516',
    '981c3c30-dbed-4d8a-b071-0d42beaf1093',
    '945431e0-d102-4d4b-99a6-fc517967c0b7',
    '4d2da171-c7c9-407d-ac2c-4e57b5e70722',
    '24a92194-d5bd-4a91-8754-f354dd55365d',
    '0f70d612-5b3d-4737-8b2b-8351072c9b67'
  ]

  for (const studentId of mondayIds) {
    const student = allStudents?.find(s => s.id === studentId)
    if (!student) continue

    const { data: studentReports } = await supabase
      .from('weekly_reports')
      .select('*')
      .eq('student_id', studentId)
      .order('week_number', { ascending: true })

    console.log(`\n${student.name} (${student.student_id}):`)
    studentReports?.forEach(r => {
      console.log(`  - 第 ${r.week_number} 周 (${r.year}年): 提交于 ${new Date(r.submitted_at).toLocaleString('zh-CN')}`)
    })

    const hasWeek23 = studentReports?.some(r => r.week_number === 23 && r.year === 2026)
    console.log(`  第23周: ${hasWeek23 ? '✅ 已提交' : '❌ 未提交'}`)
  }
}

main().catch(console.error)
