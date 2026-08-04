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

  console.log('为6位同学创建第23周的占位记录...\n')

  const students = [
    { id: 'b3b76175-b974-455f-9cb1-c89a3f02d516', name: '吴羽祥' },
    { id: '981c3c30-dbed-4d8a-b071-0d42beaf1093', name: '范家炜' },
    { id: '945431e0-d102-4d4b-99a6-fc517967c0b7', name: '徐金伟' },
    { id: '4d2da171-c7c9-407d-ac2c-4e57b5e70722', name: '唐勘捷' },
    { id: '24a92194-d5bd-4a91-8754-f354dd55365d', name: '谈家涛' },
    { id: '0f70d612-5b3d-4737-8b2b-8351072c9b67', name: '盛昀州' }
  ]

  for (const student of students) {
    // 创建占位记录（空内容，需要同学重新填写）
    const { data, error } = await supabase
      .from('weekly_reports')
      .insert({
        student_id: student.id,
        week_number: 23,
        year: 2026,
        contacted_professor: false,
        not_contacted_reason: '[请重新填写]',
        signature: null
      })
      .select()
      .single()

    if (error) {
      console.log(`❌ ${student.name}: 失败 - ${error.message}`)
    } else {
      console.log(`✅ ${student.name}: 占位记录已创建 (ID: ${data.id})`)
    }
  }

  console.log('\n这些同学可以在周报页面找到"第23周"的记录并更新内容。')
}

main().catch(console.error)
