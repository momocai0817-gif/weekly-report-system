import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'

// 格式化日期时间
function formatDateTime(date: string): string {
  const d = new Date(date)
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// 生成未交名单Excel（按区队分开）
async function generateUnsubmittedExcel(
  supabase: any,
  week: number,
  year: number,
  squad: string
): Promise<Buffer> {
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('id, name, student_id, squad, advisor')
    .eq('squad', squad)
    .order('student_id', { ascending: true })

  if (studentsError) throw studentsError

  const { data: reports, error: reportsError } = await supabase
    .from('weekly_reports')
    .select('student_id')
    .eq('week_number', week)
    .eq('year', year)

  if (reportsError) throw reportsError

  const submittedIds = new Set(reports?.map((r: any) => r.student_id) || [])

  const excelData = students
    ?.filter((student: any) => !submittedIds.has(student.id))
    .map((student: any) => ({
      '学号': student.student_id,
      '姓名': student.name,
      '区队': student.squad,
      '导师': student.advisor,
      '提交状态': '未提交',
    })) || []

  const worksheet = XLSX.utils.json_to_sheet(excelData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '未交名单')

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx', bookSST: false }) as Buffer
}

// 生成已交名单Excel（按区队分开，包含总表和按导师分sheet）
async function generateSubmittedExcel(
  supabase: any,
  week: number,
  year: number,
  squad: string
): Promise<Buffer> {
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
    .eq('week_number', week)
    .eq('year', year)
    .eq('student.squad', squad)

  if (reportsError) throw reportsError

  if (!reports || reports.length === 0) {
    throw new Error(`${squad}该周暂无提交记录`)
  }

  // 按导师分组
  const reportsByAdvisor: Record<string, any[]> = {}
  reports.forEach((report: any) => {
    const advisor = report.student.advisor
    if (!reportsByAdvisor[advisor]) {
      reportsByAdvisor[advisor] = []
    }
    reportsByAdvisor[advisor].push(report)
  })

  const workbook = XLSX.utils.book_new()
  const headers = ['序号', '姓名', '学号', '区队', '是否咨询导师', '导师是否回复', '未咨询原因', '准备工作', '问题清单', '导师反馈', '提交时间']

  // 创建总表
  const totalRows = reports.map((report: any, index: number) => [
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
    formatDateTime(report.submitted_at)
  ])

  const totalWorksheet = XLSX.utils.aoa_to_sheet([headers, ...totalRows])
  totalWorksheet['!cols'] = [
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
  XLSX.utils.book_append_sheet(workbook, totalWorksheet, '总表')

  // 为每个导师创建一个sheet
  Object.entries(reportsByAdvisor).forEach(([advisor, advisorReports]) => {
    const rows = advisorReports.map((report: any, index: number) => [
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
      formatDateTime(report.submitted_at)
    ])

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
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

    const sheetName = advisor.length > 31 ? advisor.substring(0, 31) : advisor
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  })

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx', bookSST: false }) as Buffer
}

// 生成签名ZIP（动态）
async function generateSignaturesZip(
  supabase: any,
  week: number,
  year: number
): Promise<Buffer> {
  const { data: reports, error: reportsError } = await supabase
    .from('weekly_reports')
    .select('student_id, signature')
    .eq('week_number', week)
    .eq('year', year)

  if (reportsError) throw reportsError

  if (!reports || reports.length === 0) {
    throw new Error('该周暂无提交记录')
  }

  const studentIds = reports.map((r: any) => r.student_id).filter((id: any) => id)
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('id, name, student_id, squad')
    .in('id', studentIds)

  if (studentsError) throw studentsError

  const studentMap = new Map(students?.map((s: any) => [s.id, s]) || [])

  const zip = new JSZip()
  const squad1Folder = zip.folder('一区队')
  const squad2Folder = zip.folder('二区队')

  reports.forEach((report: any) => {
    const student = studentMap.get(report.student_id) as any
    if (!student || !report.signature) return

    const filename = `${student.name}_${student.student_id}.png`
    const base64Data = report.signature.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')

    if (student.squad === '一区队') {
      squad1Folder?.file(filename, buffer)
    } else if (student.squad === '二区队') {
      squad2Folder?.file(filename, buffer)
    }
  })

  return await zip.generateAsync({ type: 'nodebuffer' })
}

// 从Storage下载文件
async function downloadFromStorage(
  supabase: any,
  bucket: string,
  path: string
): Promise<Buffer> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .download(path)

  if (error) throw error

  // 将 ArrayBuffer 转换为 Buffer
  return Buffer.from(data)
}

// 从URL提取存储路径
function extractStoragePath(url: string): string | null {
  try {
    // Supabase Storage URL 格式: https://xxx.supabase.co/storage/v1/object/public/bucket/path
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/')
    // 找到 bucket 之后的部分
    const bucketIndex = pathParts.findIndex((p: string) => p === 'weekly-archives')
    if (bucketIndex >= 0 && bucketIndex + 1 < pathParts.length) {
      return pathParts.slice(bucketIndex + 1).join('/')
    }
  } catch (e) {
    console.error('解析URL失败:', e)
  }
  return null
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const week = searchParams.get('week')
    const year = searchParams.get('year')

    if (!week || !year) {
      return NextResponse.json(
        { error: '缺少周次或年份参数' },
        { status: 400 }
      )
    }

    const weekNumber = parseInt(week)
    const yearNumber = parseInt(year)

    const supabase = createServiceClient()

    // 检查归档是否已存在
    const { data: existingArchive, error: checkError } = await supabase
      .from('weekly_archives')
      .select('*')
      .eq('week_number', weekNumber)
      .eq('year', yearNumber)
      .single()

    let squad1UnsubmittedBuffer: Buffer
    let squad2UnsubmittedBuffer: Buffer
    let squad1SubmittedBuffer: Buffer
    let squad2SubmittedBuffer: Buffer
    let signaturesBuffer: Buffer

    if (existingArchive && !checkError) {
      // 归档存在，从Storage下载（这里需要重新生成，因为格式变了）
      console.log('重新生成归档文件...')

      squad1UnsubmittedBuffer = await generateUnsubmittedExcel(supabase, weekNumber, yearNumber, '一区队')
      squad2UnsubmittedBuffer = await generateUnsubmittedExcel(supabase, weekNumber, yearNumber, '二区队')
      squad1SubmittedBuffer = await generateSubmittedExcel(supabase, weekNumber, yearNumber, '一区队')
      squad2SubmittedBuffer = await generateSubmittedExcel(supabase, weekNumber, yearNumber, '二区队')
      signaturesBuffer = await generateSignaturesZip(supabase, weekNumber, yearNumber)
    } else {
      // 归档不存在，动态生成
      console.log('动态生成归档文件...')

      squad1UnsubmittedBuffer = await generateUnsubmittedExcel(supabase, weekNumber, yearNumber, '一区队')
      squad2UnsubmittedBuffer = await generateUnsubmittedExcel(supabase, weekNumber, yearNumber, '二区队')
      squad1SubmittedBuffer = await generateSubmittedExcel(supabase, weekNumber, yearNumber, '一区队')
      squad2SubmittedBuffer = await generateSubmittedExcel(supabase, weekNumber, yearNumber, '二区队')
      signaturesBuffer = await generateSignaturesZip(supabase, weekNumber, yearNumber)
    }

    // 打包所有文件到一个ZIP，按区队分开
    const finalZip = new JSZip()

    // 一区队文件夹
    const squad1Folder = finalZip.folder('一区队')
    squad1Folder?.file(`一区队_未交名单_第${week}周.xlsx`, squad1UnsubmittedBuffer)
    squad1Folder?.file(`一区队_已交名单_第${week}周.xlsx`, squad1SubmittedBuffer)

    // 二区队文件夹
    const squad2Folder = finalZip.folder('二区队')
    squad2Folder?.file(`二区队_未交名单_第${week}周.xlsx`, squad2UnsubmittedBuffer)
    squad2Folder?.file(`二区队_已交名单_第${week}周.xlsx`, squad2SubmittedBuffer)

    // 签名文件
    finalZip.file(`签名_第${week}周.zip`, signaturesBuffer)

    const zipBuffer = await finalZip.generateAsync({ type: 'nodebuffer' })

    const filename = `第${week}周_全部归档_${year}年.zip`

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    })
  } catch (error: any) {
    console.error('导出失败:', error)
    return NextResponse.json(
      { error: error.message || '导出失败' },
      { status: 500 }
    )
  }
}
