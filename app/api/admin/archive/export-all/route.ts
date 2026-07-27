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

// 生成未交名单Excel（动态）
async function generateUnsubmittedExcel(
  supabase: any,
  week: number,
  year: number
): Promise<Buffer> {
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('id, name, student_id, squad, advisor')
    .order('squad', { ascending: true })
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

// 生成已交名单Excel（动态）
async function generateSubmittedExcel(
  supabase: any,
  week: number,
  year: number
): Promise<Buffer> {
  const { data: reports, error: reportsError } = await supabase
    .from('weekly_reports')
    .select('*')
    .eq('week_number', week)
    .eq('year', year)

  if (reportsError) throw reportsError

  if (!reports || reports.length === 0) {
    throw new Error('该周暂无提交记录')
  }

  const studentIds = reports.map((r: any) => r.student_id)
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('id, name, student_id, squad, advisor')
    .in('id', studentIds)

  if (studentsError) throw studentsError

  const studentMap = new Map(students?.map((s: any) => [s.id, s]) || [])

  const excelData = reports
    .sort((a: any, b: any) => {
      const studentA = studentMap.get(a.student_id) as any
      const studentB = studentMap.get(b.student_id) as any
      return (studentA?.student_id || '').localeCompare(studentB?.student_id || '', 'zh-CN', { numeric: true })
    })
    .map((report: any) => {
      const student = studentMap.get(report.student_id) as any
      return {
        '学号': student?.student_id || '',
        '姓名': student?.name || '',
        '区队': student?.squad || '',
        '导师': student?.advisor || '',
        '提交状态': '已提交',
        '提交时间': formatDateTime(report.submitted_at),
        '1.本周是否咨询过导师问题？': report.contacted_professor ? '是' : '否',
        '2.未咨询原因/所处阶段': !report.contacted_professor ? (report.not_contacted_reason || '') : '',
        '3.导师是否回复？': report.contacted_professor ? (report.professor_replied ? '是' : '否') : '',
        '4.具体情况说明': (report.contacted_professor && report.professor_replied) ? (report.reply_details || '') : '',
        '签名': report.signature ? '已签名' : '未签名',
      }
    })

  const worksheet = XLSX.utils.json_to_sheet(excelData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '已交名单')

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

    let unsubmittedBuffer: Buffer
    let submittedBuffer: Buffer
    let signaturesBuffer: Buffer

    if (existingArchive && !checkError) {
      // 归档存在，从Storage下载
      console.log('从Storage下载归档文件...')

      const unsubmittedPath = extractStoragePath(existingArchive.unsubmitted_file_url || '')
      const submittedPath = extractStoragePath(existingArchive.submitted_file_url || '')
      const signaturesPath = extractStoragePath(existingArchive.signatures_file_url || '')

      if (unsubmittedPath && submittedPath && signaturesPath) {
        unsubmittedBuffer = await downloadFromStorage(supabase, 'weekly-archives', unsubmittedPath)
        submittedBuffer = await downloadFromStorage(supabase, 'weekly-archives', submittedPath)
        signaturesBuffer = await downloadFromStorage(supabase, 'weekly-archives', signaturesPath)
      } else {
        throw new Error('无法解析归档文件路径')
      }
    } else {
      // 归档不存在，动态生成
      console.log('动态生成归档文件...')

      unsubmittedBuffer = await generateUnsubmittedExcel(supabase, weekNumber, yearNumber)
      submittedBuffer = await generateSubmittedExcel(supabase, weekNumber, yearNumber)
      signaturesBuffer = await generateSignaturesZip(supabase, weekNumber, yearNumber)
    }

    // 打包所有文件到一个ZIP
    const finalZip = new JSZip()

    finalZip.file(`未交名单_第${week}周.xlsx`, unsubmittedBuffer)
    finalZip.file(`已交名单_第${week}周.xlsx`, submittedBuffer)
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
