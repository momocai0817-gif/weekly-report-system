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
  console.log('测试Supabase连接...\n')

  // 使用anon key测试
  const supabaseAnon = createClient(
    envVars.NEXT_PUBLIC_SUPABASE_URL!,
    envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  console.log('使用ANON_KEY测试:')
  const { data: students1, error: error1 } = await supabaseAnon
    .from('students')
    .select('id, name')
    .limit(1)
  console.log(`  结果: ${error1 ? error1.message : `OK, 找到${students1?.length || 0}条`}`)

  // 使用service role key测试
  const supabaseService = createClient(
    envVars.NEXT_PUBLIC_SUPABASE_URL!,
    envVars.SUPABASE_SERVICE_ROLE_KEY!
  )

  console.log('\n使用SERVICE_ROLE_KEY测试:')
  const { data: students2, error: error2 } = await supabaseService
    .from('students')
    .select('id, name')
    .limit(1)
  console.log(`  结果: ${error2 ? error2.message : `OK, 找到${students2?.length || 0}条`}`)

  // 测试周报表
  console.log('\n测试周报表:')
  const { data: reports, error: error3 } = await supabaseService
    .from('weekly_reports')
    .select('id, week_number, year')
    .limit(1)
  console.log(`  结果: ${error3 ? error3.message : `OK, 找到${reports?.length || 0}条`}`)

  // 统计总数
  const { count, error: error4 } = await supabaseService
    .from('weekly_reports')
    .select('*', { count: 'exact', head: true })
  console.log(`  总数: ${error4 ? error4.message : count || 0}条`)
}

main().catch(console.error)
