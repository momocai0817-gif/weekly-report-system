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

async function restore(backupFile: string) {
  const supabase = createClient(
    envVars.NEXT_PUBLIC_SUPABASE_URL!,
    envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  console.log(`从备份文件恢复: ${backupFile}\n`)

  const backup = JSON.parse(readFileSync(backupFile, 'utf-8'))
  console.log(`备份时间: ${backup.timestamp}`)

  let restored = 0
  let skipped = 0

  // 恢复周报（检查是否已存在）
  for (const report of backup.weekly_reports) {
    const { data: existing } = await supabase
      .from('weekly_reports')
      .select('id')
      .eq('student_id', report.student_id)
      .eq('week_number', report.week_number)
      .eq('year', report.year)
      .single()

    if (existing) {
      skipped++
      console.log(`⏭️  跳过: 学生ID ${report.student_id.substring(0, 8)}... 第${report.week_number}周（已存在）`)
    } else {
      // 恢复记录（去掉自动生成的id）
      const { id, ...reportData } = report
      const { error } = await supabase
        .from('weekly_reports')
        .insert(reportData)

      if (error) {
        console.log(`❌ 失败: ${error.message}`)
      } else {
        restored++
        console.log(`✅ 恢复: 学生ID ${report.student_id.substring(0, 8)}... 第${report.week_number}周`)
      }
    }
  }

  console.log(`\n恢复完成！`)
  console.log(`   恢复: ${restored} 条`)
  console.log(`   跳过: ${skipped} 条`)
}

// 从命令行参数获取备份文件
const backupFile = process.argv[2]
if (!backupFile) {
  console.log('用法: npx tsx scripts/restore-database.ts <备份文件路径>')
  console.log('示例: npx tsx scripts/restore-database.ts backups/backup-2026-08-04.json')
  process.exit(1)
}

restore(backupFile).catch(console.error)
