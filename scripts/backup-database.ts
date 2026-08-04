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

// 调试：打印环境变量
console.log('环境变量检查:')
console.log(`  SUPABASE_URL: ${envVars.NEXT_PUBLIC_SUPABASE_URL ? '已设置' : '未设置'}`)
console.log(`  SERVICE_KEY: ${envVars.SUPABASE_SERVICE_ROLE_KEY ? '已设置' : '未设置'}`)

const BACKUP_BUCKET = 'backups'  // Storage bucket 名称

async function backup() {
  const supabase = createClient(
    envVars.NEXT_PUBLIC_SUPABASE_URL!,
    envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  console.log('开始备份数据库...\n')

  const backup: any = {
    timestamp: new Date().toISOString(),
    students: [],
    weekly_reports: [],
    admins: []
  }

  // 备份学生表
  console.log('正在备份学生表...')
  const { data: students, error: studentError } = await supabase
    .from('students')
    .select('*')
    .order('name')
  if (studentError) {
    console.error(`  学生表错误: ${studentError.message}`)
  } else {
    backup.students = students || []
    console.log(`  学生表: ${backup.students.length} 条`)
  }

  // 备份周报表（使用分页，每次100条）
  console.log('正在备份周报表...')
  let allReports: any[] = []
  let page = 0
  const pageSize = 100
  let hasMore = true

  while (hasMore) {
    const { data: reports, error } = await supabase
      .from('weekly_reports')
      .select('*')
      .order('submitted_at', { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (error) {
      console.error(`  周报表错误: ${error.message}`)
      hasMore = false
      break
    }

    if (reports && reports.length > 0) {
      allReports = allReports.concat(reports)
      console.log(`  已获取 ${allReports.length} 条周报...`)
      hasMore = reports.length === pageSize
      page++
    } else {
      hasMore = false
    }
  }
  backup.weekly_reports = allReports
  console.log(`  周报表: ${backup.weekly_reports.length} 条`)

  // 备份管理员表
  console.log('正在备份管理员表...')
  const { data: admins, error: adminError } = await supabase
    .from('admins')
    .select('*')
  if (adminError) {
    console.error(`  管理员表错误: ${adminError.message}`)
  } else {
    backup.admins = admins || []
    console.log(`  管理员表: ${backup.admins.length} 条`)
  }

  console.log(`✅ 数据收集完成！`)
  console.log(`   学生: ${backup.students.length} 条`)
  console.log(`   周报: ${backup.weekly_reports.length} 条`)
  console.log(`   管理员: ${backup.admins.length} 条`)

  // 上传到Supabase Storage
  console.log('\n正在上传到Supabase Storage...')
  try {
    // 检查bucket是否存在，不存在则创建
    const { data: buckets } = await supabase.storage.listBuckets()
    const bucketExists = buckets?.some(b => b.name === BACKUP_BUCKET)

    if (!bucketExists) {
      console.log(`  创建Storage bucket: ${BACKUP_BUCKET}`)
      const { error: createError } = await supabase.storage.createBucket(BACKUP_BUCKET, {
        public: false,
        fileSizeLimit: '10MB'
      })
      if (createError) {
        console.log(`  ⚠️  创建bucket失败: ${createError.message}`)
        console.log(`  提示: 请在Supabase仪表板中手动创建名为 "${BACKUP_BUCKET}" 的Storage bucket`)
        return
      }
    }

    // 上传文件
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const fileName = `backups/${timestamp}.json`
    const fileContent = JSON.stringify(backup, null, 2)

    const { error: uploadError } = await supabase
      .storage
      .from(BACKUP_BUCKET)
      .upload(fileName, fileContent, {
        contentType: 'application/json',
        upsert: true
      })

    if (uploadError) {
      console.log(`  ⚠️  上传失败: ${uploadError.message}`)
    } else {
      console.log(`  ✅ 已上传到Supabase Storage: ${fileName}`)

      // 获取文件URL
      const { data: { publicUrl } } = supabase
        .storage
        .from(BACKUP_BUCKET)
        .getPublicUrl(fileName)
      console.log(`  下载URL: ${publicUrl}`)
    }
  } catch (err: any) {
    console.log(`  ⚠️  Storage操作失败: ${err.message}`)
    console.log(`  提示: 请在Supabase仪表板中创建名为 "${BACKUP_BUCKET}" 的Storage bucket`)
  }
}

backup().catch(console.error)
