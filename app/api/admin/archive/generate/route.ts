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

// 生成未交名单Excel
async function generateUnsubmittedExcel(
  supabase: any,
  week: number,
  year: number
): Promise<Buffer> {
  // 获取所有学生
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('id, name, student_id, squad, advisor')
    .order('squad', { ascending: true })
    .order('student_id', { ascending: true })

  if (studentsError) throw studentsError

  // 获取本周已提交的学生ID
  const { data: reports, error: reportsError } = await supabase
    .from('weekly_reports')
    .select('student_id')
    .eq('week_number', week)
    .eq('year', year)

  if (reportsError) throw reportsError

  const submittedIds = new Set(reports?.map(r => r.student_id) || [])

  // 创建未交名单数据
  const excelData = students
    .filter(student => !submittedIds.has(student.id))
    .map(student => ({
      '学号': student.student_id,
      '姓名': student.name,
      '区队': student.squad,
      '导师': student.advisor,
      '提交状态': '未提交',
    }))

  const worksheet = XLSX.utils.json_to_sheet(excelData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '未交名单')

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx', bookSST: false }) as Buffer
}

// 生成已交名单Excel
async function generateSubmittedExcel(
  supabase: any,
  week: number,
  year: number
): Promise<Buffer> {
  // 获取本周所有周报
  const { data: reports, error: reportsError } = await supabase
    .from('weekly_reports')
    .select('*')
    .eq('week_number', week)
    .eq('year', year)

  if (reportsError) throw reportsError

  if (!reports || reports.length === 0) {
    throw new Error('该周暂无提交记录')
  }

  // 获取学生信息
  const studentIds = reports.map(r => r.student_id)
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('id, name, student_id, squad, advisor')
    .in('id', studentIds)

  if (studentsError) throw studentsError

  const studentMap = new Map(students?.map(s => [s.id, s]) || [])

  // 创建已交名单数据
  const excelData = reports
    .sort((a, b) => {
      const studentA = studentMap.get(a.student_id)
      const studentB = studentMap.get(b.student_id)
      return (studentA?.student_id || '').localeCompare(studentB?.student_id || '', 'zh-CN', { numeric: true })
    })
    .map(report => {
      const student = studentMap.get(report.student_id)
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

// 生成签名ZIP
async function generateSignaturesZip(
  supabase: any,
  week: number,
  year: number
): Promise<Buffer> {
  // 获取本周所有周报
  const { data: reports, error: reportsError } = await supabase
    .from('weekly_reports')
    .select('student_id, signature')
    .eq('week_number', week)
    .eq('year', year)

  if (reportsError) throw reportsError

  if (!reports || reports.length === 0) {
    throw new Error('该周暂无提交记录')
  }

  // 获取学生信息
  const studentIds = reports.map(r => r.student_id).filter(id => id)
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('id, name, student_id, squad')
    .in('id', studentIds)

  if (studentsError) throw studentsError

  const studentMap = new Map(students?.map(s => [s.id, s]) || [])

  // 创建ZIP文件
  const zip = new JSZip()
  const squad1Folder = zip.folder('一区队')
  const squad2Folder = zip.folder('二区队')

  // 添加签名图片
  reports.forEach(report => {
    const student = studentMap.get(report.student_id)
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

// 上传文件到 Supabase Storage
async function uploadToStorage(
  supabase: any,
  bucket: string,
  path: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  // 确保存储桶存在
  const { data: bucketData, error: bucketError } = await supabase.storage.getBucket(bucket)

  if (bucketError) {
    // 存储桶不存在，尝试创建
    const { error: createError } = await supabase.storage.createBucket(bucket, {
      public: false,
      fileSizeLimit: 10485760, // 10MB
    })

    if (createError && createError.message !== 'Duplicate bucket') {
      console.error('创建存储桶失败:', createError)
      // 不抛出错误，继续尝试上传
    }
  }

  // 上传文件
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, buffer, {
      contentType,
      upsert: true,
    })

  if (error) {
    console.error('上传文件失败:', error)
    throw error
  }

  // 获取公开URL
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(path)

  return urlData.publicUrl
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const week = searchParams.get('week')
    const year = searchParams.get('year')
    const force = searchParams.get('force') === 'true'

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

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError
    }

    // 如果归档已存在且不强制重新生成，直接返回
    if (existingArchive && !force) {
      return NextResponse.json({
        message: '归档已存在',
        archive: existingArchive,
      })
    }

    // 生成三种文件
    console.log(`开始生成第${week}周(${year}年)归档文件...`)

    // 1. 生成未交名单
    const unsubmittedBuffer = await generateUnsubmittedExcel(supabase, weekNumber, yearNumber)
    const unsubmittedPath = `archives/${year}/week-${week}/unsubmitted.xlsx`
    const unsubmittedUrl = await uploadToStorage(
      supabase,
      'weekly-archives',
      unsubmittedPath,
      unsubmittedBuffer,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    console.log('未交名单已上传:', unsubmittedUrl)

    // 2. 生成已交名单
    const submittedBuffer = await generateSubmittedExcel(supabase, weekNumber, yearNumber)
    const submittedPath = `archives/${year}/week-${week}/submitted.xlsx`
    const submittedUrl = await uploadToStorage(
      supabase,
      'weekly-archives',
      submittedPath,
      submittedBuffer,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    console.log('已交名单已上传:', submittedUrl)

    // 3. 生成签名ZIP
    const signaturesBuffer = await generateSignaturesZip(supabase, weekNumber, yearNumber)
    const signaturesPath = `archives/${year}/week-${week}/signatures.zip`
    const signaturesUrl = await uploadToStorage(
      supabase,
      'weekly-archives',
      signaturesPath,
      signaturesBuffer,
      'application/zip'
    )
    console.log('签名文件已上传:', signaturesUrl)

    // 保存或更新归档记录
    const archiveData = {
      week_number: weekNumber,
      year: yearNumber,
      unsubmitted_file_url: unsubmittedUrl,
      submitted_file_url: submittedUrl,
      signatures_file_url: signaturesUrl,
    }

    let result
    if (existingArchive) {
      // 更新现有记录
      const { data, error } = await supabase
        .from('weekly_archives')
        .update(archiveData)
        .eq('id', existingArchive.id)
        .select()
        .single()

      if (error) throw error
      result = data
    } else {
      // 插入新记录
      const { data, error } = await supabase
        .from('weekly_archives')
        .insert(archiveData)
        .select()
        .single()

      if (error) throw error
      result = data
    }

    console.log(`第${week}周(${year}年)归档完成`)

    return NextResponse.json({
      message: '归档生成成功',
      archive: result,
    })
  } catch (error: any) {
    console.error('生成归档失败:', error)
    return NextResponse.json(
      { error: error.message || '生成归档失败' },
      { status: 500 }
    )
  }
}
