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

async function exportSquad2Week25() {
  const supabase = createClient(
    envVars.NEXT_PUBLIC_SUPABASE_URL!,
    envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  console.log('正在检查数据库中的周报数据...')

  // 先查看数据库中所有的周次数据
  const { data: allWeeks, error: allWeeksError } = await supabase
    .from('weekly_reports')
    .select('week_number, year')
    .order('year', { ascending: false })
    .order('week_number', { ascending: false })
    .limit(20)

  if (allWeeksError) {
    console.error('查询周次失败:', allWeeksError)
  } else {
    console.log('最近20周的周报数据：')
    const weekCounts: Record<string, number> = {}
    allWeeks?.forEach((w: any) => {
      const key = `${w.year}年第${w.week_number}周`
      weekCounts[key] = (weekCounts[key] || 0) + 1
    })
    Object.entries(weekCounts).forEach(([key, count]) => {
      console.log(`  ${key}: ${count} 份`)
    })
  }

  console.log('\n正在检查25周数据...')

  // 检查weekly_reports表中25周的数据
  const { data: allWeek25, error: week25Error } = await supabase
    .from('weekly_reports')
    .select('week_number, year')
    .eq('week_number', 25)
    .eq('year', 2026)

  if (week25Error) {
    console.error('检查数据失败:', week25Error)
  }

  console.log(`weekly_reports表中25周总共有 ${allWeek25?.length || 0} 份周报`)

  let allReports: any[] = []

  // 如果weekly_reports表有数据
  if (allWeek25 && allWeek25.length > 0) {
    console.log('从weekly_reports表获取数据...')
    const { data: reports, error: reportsError } = await supabase
      .from('weekly_reports')
      .select(`
        *,
        student:students!inner (
          name,
          student_id,
          squad,
          advisor
        )
      `)
      .eq('week_number', 25)
      .eq('year', 2026)
      .order('submitted_at', { ascending: true })

    if (reportsError) {
      console.error('获取数据失败:', reportsError)
      process.exit(1)
    }
    allReports = reports || []
  }

  if (!allReports || allReports.length === 0) {
    console.log('25周暂无周报数据')
    return
  }

  // 按区队分组
  const squad1Reports = allReports.filter(r => r.student.squad === '一区队')
  const squad2Reports = allReports.filter(r => r.student.squad === '二区队')

  console.log(`\n一区队: ${squad1Reports.length} 人`)
  console.log(`二区队: ${squad2Reports.length} 人\n`)

  if (squad2Reports.length === 0) {
    console.log('25周二区队暂无已交周报')
    if (squad1Reports.length > 0) {
      console.log('\n25周一区队已交名单：')
      squad1Reports.forEach((report: any, index: number) => {
        console.log(`${index + 1}. ${report.student.name} (${report.student.student_id})`)
      })
    }
    return
  }

  // 按导师分组
  const reportsByAdvisor: Record<string, any[]> = {}
  squad2Reports.forEach((report: any) => {
    const advisor = report.student.advisor
    if (!reportsByAdvisor[advisor]) {
      reportsByAdvisor[advisor] = []
    }
    reportsByAdvisor[advisor].push(report)
  })

  console.log('='.repeat(80))
  console.log('25周二区队已交名单（按导师分组）')
  console.log('='.repeat(80))
  console.log()

  // 显示每个导师的学生数量
  Object.entries(reportsByAdvisor).forEach(([advisor, reports]) => {
    console.log(`${advisor}: ${reports.length} 人`)
  })
  console.log(`\n总计：${squad2Reports.length} 人`)
  console.log('='.repeat(80))

  // 导出为Excel，按导师分sheet
  const XLSX = require('xlsx')
  const headers = ['序号', '姓名', '学号', '区队', '是否咨询导师', '导师是否回复', '未咨询原因', '准备工作', '问题清单', '导师反馈', '提交时间']

  const workbook = XLSX.utils.book_new()

  // 首先创建总表sheet
  const totalHeaders = ['序号', '姓名', '学号', '区队', '导师', '是否咨询导师', '导师是否回复', '未咨询原因', '准备工作', '问题清单', '导师反馈', '提交时间']
  const totalRows = squad2Reports.map((report: any, index: number) => [
    index + 1,
    report.student.name,
    report.student.student_id,
    report.student.squad,
    report.student.advisor,
    report.contacted_professor ? '是' : '否',
    report.contacted_professor ? (report.professor_replied ? '是' : '否') : '-',
    report.not_contacted_reason || '',
    report.preparation_work || '',
    report.question_list || '',
    report.advisor_feedback || '',
    new Date(report.submitted_at).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  ])

  const totalWorksheet = XLSX.utils.aoa_to_sheet([totalHeaders, ...totalRows])

  // 设置总表列宽
  totalWorksheet['!cols'] = [
    { wch: 8 },  // 序号
    { wch: 12 }, // 姓名
    { wch: 15 }, // 学号
    { wch: 10 }, // 区队
    { wch: 12 }, // 导师
    { wch: 12 }, // 是否咨询导师
    { wch: 12 }, // 导师是否回复
    { wch: 30 }, // 未咨询原因
    { wch: 50 }, // 准备工作
    { wch: 50 }, // 问题清单
    { wch: 50 }, // 导师反馈
    { wch: 20 }, // 提交时间
  ]

  XLSX.utils.book_append_sheet(workbook, totalWorksheet, '总表')

  // 然后为每个导师创建一个sheet
  Object.entries(reportsByAdvisor).forEach(([advisor, reports]) => {
    const rows = reports.map((report: any, index: number) => [
      index + 1,
      report.student.name,
      report.student.student_id,
      report.student.squad,
      report.contacted_professor ? '是' : '否',
      report.contacted_professor ? (report.professor_replied ? '是' : '否') : '-',
      report.not_contacted_reason || '',
      report.preparation_work || '',
      report.question_list || '',
      report.advisor_feedback || '',
      new Date(report.submitted_at).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      })
    ])

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows])

    // 设置列宽
    worksheet['!cols'] = [
      { wch: 8 },  // 序号
      { wch: 12 }, // 姓名
      { wch: 15 }, // 学号
      { wch: 10 }, // 区队
      { wch: 12 }, // 是否咨询导师
      { wch: 12 }, // 导师是否回复
      { wch: 30 }, // 未咨询原因
      { wch: 50 }, // 准备工作
      { wch: 50 }, // 问题清单
      { wch: 50 }, // 导师反馈
      { wch: 20 }, // 提交时间
    ]

    // 使用导师姓名作为sheet名，Excel sheet名不能超过31个字符
    const sheetName = advisor.length > 31 ? advisor.substring(0, 31) : advisor
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  })

  // 使用时间戳避免文件冲突
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')
  const filename = `25周二区队已交名单_${timestamp}`
  XLSX.writeFile(workbook, `${filename}.xlsx`)

  console.log(`\n已导出到 ${filename}.xlsx`)
  console.log(`共生成 ${Object.keys(reportsByAdvisor).length} 个导师sheet`)
}

exportSquad2Week25().catch(console.error)