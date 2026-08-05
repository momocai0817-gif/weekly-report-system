'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentWeek, generateUnsubmittedList, copyToClipboard } from '@/lib/utils'

interface Student {
  id: string
  name: string
  student_id: string
  squad: string
  advisor: string
}

interface Stats {
  total: number
  submitted: number
  unsubmitted: number
  squad1Total: number
  squad1Submitted: number
  squad2Total: number
  squad2Submitted: number
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Stats | null>(null)
  const [unsubmittedStudents, setUnsubmittedStudents] = useState<Student[]>([])
  const [copied, setCopied] = useState(false)
  const [showLateExportModal, setShowLateExportModal] = useState(false)
  const [lateReports, setLateReports] = useState<any[]>([])
  const [loadingLate, setLoadingLate] = useState(false)

  const currentWeek = getCurrentWeek()
  // 上一周（用于导出晚交名单）
  const lastWeek = currentWeek.weekNumber > 1
    ? { weekNumber: currentWeek.weekNumber - 1, year: currentWeek.year }
    : { weekNumber: 52, year: currentWeek.year - 1 }

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (!userStr) {
      router.push('/login')
      return
    }

    const userData = JSON.parse(userStr)
    if (userData.role !== 'admin') {
      router.push('/login')
      return
    }

    setUser(userData)
    fetchDashboardData()
  }, [router])

  // 当打开晚交弹窗时获取数据
  useEffect(() => {
    if (showLateExportModal) {
      fetchLateReports()
    }
  }, [showLateExportModal])

  const fetchLateReports = async () => {
    setLoadingLate(true)
    try {
      const response = await fetch(
        `/api/admin/late-reports?week=${lastWeek.weekNumber}&year=${lastWeek.year}`
      )
      const data = await response.json()
      setLateReports(data.lateReports || [])
    } catch (err) {
      console.error('获取晚交名单失败:', err)
    } finally {
      setLoadingLate(false)
    }
  }

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      // 获取统计数据
      const statsRes = await fetch(
        `/api/admin/stats?week=${currentWeek.weekNumber}&year=${currentWeek.year}`
      )
      const statsData = await statsRes.json()
      setStats(statsData.stats)

      // 获取未提交学生列表
      const unsubmittedRes = await fetch(
        `/api/admin/unsubmitted?week=${currentWeek.weekNumber}&year=${currentWeek.year}`
      )
      const unsubmittedData = await unsubmittedRes.json()
      setUnsubmittedStudents(unsubmittedData.students || [])
    } catch (err) {
      console.error('获取数据失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCopyUnsubmitted = async () => {
    const text = generateUnsubmittedList(unsubmittedStudents)
    const success = await copyToClipboard(text)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleExportExcel = async (squad?: string) => {
    try {
      const url = squad
        ? `/api/admin/export/unsubmitted?week=${currentWeek.weekNumber}&year=${currentWeek.year}&squad=${encodeURIComponent(squad)}`
        : `/api/admin/export/unsubmitted?week=${currentWeek.weekNumber}&year=${currentWeek.year}`

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error('导出失败')
      }

      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = squad
        ? `${squad}_未交名单_第${currentWeek.weekNumber}周.xlsx`
        : `未交名单_第${currentWeek.weekNumber}周.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(blobUrl)
    } catch (err) {
      console.error('导出失败:', err)
      alert('导出失败，请稍后重试')
    }
  }

  const handleExportSubmitted = async (squad?: string) => {
    try {
      const url = squad
        ? `/api/admin/export/submitted?week=${currentWeek.weekNumber}&year=${currentWeek.year}&squad=${encodeURIComponent(squad)}`
        : `/api/admin/export/submitted?week=${currentWeek.weekNumber}&year=${currentWeek.year}`

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error('导出失败')
      }

      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = squad
        ? `${squad}_已交名单_第${currentWeek.weekNumber}周.xlsx`
        : `已交名单_第${currentWeek.weekNumber}周.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(blobUrl)
    } catch (err) {
      console.error('导出失败:', err)
      alert('导出失败，请稍后重试')
    }
  }

  const handleExportSignatures = async (squad?: string) => {
    try {
      const url = squad
        ? `/api/admin/export/signatures?week=${currentWeek.weekNumber}&year=${currentWeek.year}&squad=${encodeURIComponent(squad)}`
        : `/api/admin/export/signatures?week=${currentWeek.weekNumber}&year=${currentWeek.year}`

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error('导出失败')
      }

      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = squad
        ? `${squad}_签名_第${currentWeek.weekNumber}周.zip`
        : `签名_第${currentWeek.weekNumber}周.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(blobUrl)
    } catch (err) {
      console.error('导出失败:', err)
      alert('导出失败，请稍后重试')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    router.push('/login')
  }

  // 导出晚交名单Excel
  const handleExportLateExcel = async (squad?: string) => {
    try {
      const url = `/api/admin/late-reports?week=${lastWeek.weekNumber}&year=${lastWeek.year}`

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('获取晚交数据失败')
      }

      const data = await response.json()
      const lateReports = squad
        ? data.lateReports.filter((r: any) => r.student.squad === squad)
        : data.lateReports

      if (lateReports.length === 0) {
        alert(squad ? `${squad}没有晚交记录` : '没有晚交记录')
        return
      }

      const XLSX = require('xlsx')
      const headers = ['姓名', '学号', '区队', '导师', '周次', '是否咨询导师', '导师是否回复', '提交时间']

      const rows = lateReports.map((report: any) => [
        report.student.name,
        report.student.student_id,
        report.student.squad,
        report.student.advisor,
        `${report.year}年第${report.week_number}周`,
        report.contacted_professor ? '是' : '否',
        report.contacted_professor ? (report.professor_replied ? '是' : '否') : '-',
        new Date(report.submitted_at).toLocaleString('zh-CN')
      ])

      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
      worksheet['!cols'] = [
        { wch: 12 }, { wch: 15 }, { wch: 10 }, { wch: 12 },
        { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 20 },
      ]

      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, '晚交名单')
      XLSX.writeFile(workbook, squad
        ? `${squad}_晚交名单_第${lastWeek.weekNumber}周.xlsx`
        : `晚交名单_第${lastWeek.weekNumber}周.xlsx`
      )
    } catch (err) {
      console.error('导出失败:', err)
      alert('导出失败，请稍后重试')
    }
  }

  // 导出晚交人员签名
  const handleExportLateSignatures = async (squad?: string) => {
    try {
      const url = `/api/admin/late-reports?week=${lastWeek.weekNumber}&year=${lastWeek.year}`

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('获取晚交数据失败')
      }

      const data = await response.json()
      const lateReports = squad
        ? data.lateReports.filter((r: any) => r.student.squad === squad)
        : data.lateReports

      const withSignatures = lateReports.filter((r: any) => r.signature)

      if (withSignatures.length === 0) {
        alert(squad ? `${squad}晚交人员没有签名` : '晚交人员没有签名')
        return
      }

      const JSZip = require('jszip')
      const zip = new JSZip()

      if (squad) {
        // 单个区队
        const folder = zip.folder(squad)
        withSignatures.forEach((report: any) => {
          const filename = `${report.student.name}_${report.student.student_id}.png`
          // 将base64转换为blob
          const base64Data = report.signature.split(',')[1]
          folder.file(filename, base64Data, { base64: true })
        })
      } else {
        // 全部，按区分队
        const squad1 = withSignatures.filter((r: any) => r.student.squad === '一区队')
        const squad2 = withSignatures.filter((r: any) => r.student.squad === '二区队')

        if (squad1.length > 0) {
          const folder1 = zip.folder('一区队')
          squad1.forEach((report: any) => {
            const filename = `${report.student.name}_${report.student.student_id}.png`
            const base64Data = report.signature.split(',')[1]
            folder1!.file(filename, base64Data, { base64: true })
          })
        }

        if (squad2.length > 0) {
          const folder2 = zip.folder('二区队')
          squad2.forEach((report: any) => {
            const filename = `${report.student.name}_${report.student.student_id}.png`
            const base64Data = report.signature.split(',')[1]
            folder2!.file(filename, base64Data, { base64: true })
          })
        }
      }

      const content = await zip.generateAsync({ type: 'blob' })
      const blobUrl = window.URL.createObjectURL(content)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = squad
        ? `${squad}_晚交签名_第${lastWeek.weekNumber}周.zip`
        : `晚交签名_第${lastWeek.weekNumber}周.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(blobUrl)
    } catch (err) {
      console.error('导出失败:', err)
      alert('导出失败，请稍后重试')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">加载中...</div>
      </div>
    )
  }

  const submissionRate = stats
    ? Math.round((stats.submitted / stats.total) * 100)
    : 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-800">论文指导周报系统</h1>
            <p className="text-sm text-gray-900">管理端</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">{user?.name}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              退出
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* 当前周次信息 + 晚交名单入口 */}
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">
            第 {currentWeek.weekNumber} 周 ({currentWeek.year}年)
          </h2>
          <button
            onClick={() => setShowLateExportModal(true)}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition font-medium flex items-center gap-2 shadow-sm"
          >
            <span className="text-lg">⚠️</span>
            导出第{lastWeek.weekNumber}周晚交名单
          </button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-500 mb-1">总人数</p>
            <p className="text-3xl font-bold text-gray-800">{stats?.total || 0}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-500 mb-1">已提交</p>
            <p className="text-3xl font-bold text-green-600">{stats?.submitted || 0}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-500 mb-1">未提交</p>
            <p className="text-3xl font-bold text-red-600">{stats?.unsubmitted || 0}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-500 mb-1">提交率</p>
            <p className="text-3xl font-bold text-blue-600">{submissionRate}%</p>
          </div>
        </div>

        {/* 区队统计 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-medium text-gray-800 mb-4">一区队</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-800">总人数</span>
                <span className="font-medium text-gray-900">{stats?.squad1Total || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">已提交</span>
                <span className="font-medium text-green-600">
                  {stats?.squad1Submitted || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">未提交</span>
                <span className="font-medium text-red-600">
                  {(stats?.squad1Total || 0) - (stats?.squad1Submitted || 0)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-medium text-gray-800 mb-4">二区队</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-800">总人数</span>
                <span className="font-medium text-gray-900">{stats?.squad2Total || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">已提交</span>
                <span className="font-medium text-green-600">
                  {stats?.squad2Submitted || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">未提交</span>
                <span className="font-medium text-red-600">
                  {(stats?.squad2Total || 0) - (stats?.squad2Submitted || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 未交名单操作 */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium text-gray-800">
              未交名单 ({unsubmittedStudents.length}人)
            </h3>
            <div className="flex gap-2">
              <button
                onClick={handleCopyUnsubmitted}
                disabled={unsubmittedStudents.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
              >
                {copied ? '✓ 已复制' : '📋 复制名单'}
              </button>
            </div>
          </div>

          {/* 区队分别导出 */}
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-3">按区队导出 Excel：</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleExportExcel('一区队')}
                disabled={unsubmittedStudents.filter(s => s.squad === '一区队').length === 0}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
              >
                📊 导出一区队
                <span className="text-xs opacity-75">
                  ({unsubmittedStudents.filter(s => s.squad === '一区队').length}人)
                </span>
              </button>
              <button
                onClick={() => handleExportExcel('二区队')}
                disabled={unsubmittedStudents.filter(s => s.squad === '二区队').length === 0}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
              >
                📊 导出二区队
                <span className="text-xs opacity-75">
                  ({unsubmittedStudents.filter(s => s.squad === '二区队').length}人)
                </span>
              </button>
              <button
                onClick={() => handleExportExcel()}
                disabled={unsubmittedStudents.length === 0}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
              >
                📊 导出全部
              </button>
            </div>
          </div>

          {/* 未交学生列表 - 按区队分开显示 */}
          {unsubmittedStudents.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              🎉 所有学生都已提交！
            </p>
          ) : (
            <div className="space-y-4">
              {/* 一区队 */}
              {unsubmittedStudents.filter(s => s.squad === '一区队').length > 0 && (
                <div>
                  <h4 className="text-base font-semibold text-gray-900 mb-3">
                    一区队 ({unsubmittedStudents.filter(s => s.squad === '一区队').length}人)
                  </h4>
                  <div className="space-y-2">
                    {unsubmittedStudents
                      .filter(s => s.squad === '一区队')
                      .map((student) => (
                        <div
                          key={student.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <span className="font-medium text-gray-900">{student.name}</span>
                            <span className="text-gray-700 text-sm ml-2">
                              ({student.student_id})
                            </span>
                          </div>
                          <span className="text-sm text-gray-800">
                            导师：{student.advisor}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* 二区队 */}
              {unsubmittedStudents.filter(s => s.squad === '二区队').length > 0 && (
                <div>
                  <h4 className="text-base font-semibold text-gray-900 mb-3">
                    二区队 ({unsubmittedStudents.filter(s => s.squad === '二区队').length}人)
                  </h4>
                  <div className="space-y-2">
                    {unsubmittedStudents
                      .filter(s => s.squad === '二区队')
                      .map((student) => (
                        <div
                          key={student.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <span className="font-medium text-gray-900">{student.name}</span>
                            <span className="text-gray-700 text-sm ml-2">
                              ({student.student_id})
                            </span>
                          </div>
                          <span className="text-sm text-gray-800">
                            导师：{student.advisor}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 已交名单导出 */}
        <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium text-gray-800">
              已交名单导出
            </h3>
          </div>

          {/* Excel导出 */}
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-3">导出Excel已交人员名单（包含问题答案）：</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleExportSubmitted('一区队')}
                disabled={(stats?.squad1Submitted || 0) === 0}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
              >
                📊 导出一区队
                <span className="text-xs opacity-75">
                  ({stats?.squad1Submitted || 0}人)
                </span>
              </button>
              <button
                onClick={() => handleExportSubmitted('二区队')}
                disabled={(stats?.squad2Submitted || 0) === 0}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
              >
                📊 导出二区队
                <span className="text-xs opacity-75">
                  ({stats?.squad2Submitted || 0}人)
                </span>
              </button>
              <button
                onClick={() => handleExportSubmitted()}
                disabled={(stats?.submitted || 0) === 0}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
              >
                📊 导出全部
              </button>
            </div>
          </div>

          {/* 签名导出 */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-3">导出签名图片ZIP（含一区队/二区队文件夹）：</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleExportSignatures('一区队')}
                disabled={(stats?.squad1Submitted || 0) === 0}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
              >
                📁 导出一区队
                <span className="text-xs opacity-75">
                  ({stats?.squad1Submitted || 0}人)
                </span>
              </button>
              <button
                onClick={() => handleExportSignatures('二区队')}
                disabled={(stats?.squad2Submitted || 0) === 0}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
              >
                📁 导出二区队
                <span className="text-xs opacity-75">
                  ({stats?.squad2Submitted || 0}人)
                </span>
              </button>
              <button
                onClick={() => handleExportSignatures()}
                disabled={(stats?.submitted || 0) === 0}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
              >
                📁 导出全部
              </button>
            </div>
          </div>
        </div>

        {/* 快捷操作 */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <button
            onClick={() => router.push('/admin/students')}
            className="bg-white rounded-xl shadow-sm p-4 text-left hover:shadow-md transition"
          >
            <div className="text-2xl mb-2">👥</div>
            <h4 className="font-medium text-gray-800">学生管理</h4>
            <p className="text-sm text-gray-500">管理学生名单和导师</p>
          </button>

          <button
            onClick={() => router.push('/admin/reports')}
            className="bg-white rounded-xl shadow-sm p-4 text-left hover:shadow-md transition"
          >
            <div className="text-2xl mb-2">📝</div>
            <h4 className="font-medium text-gray-800">查看周报</h4>
            <p className="text-sm text-gray-500">查看学生提交的内容</p>
          </button>

          <button
            onClick={() => router.push('/admin/archive')}
            className="bg-white rounded-xl shadow-sm p-4 text-left hover:shadow-md transition"
          >
            <div className="text-2xl mb-2">📦</div>
            <h4 className="font-medium text-gray-800">历史归档</h4>
            <p className="text-sm text-gray-500">查看历史记录</p>
          </button>

          <button
            onClick={() => router.push('/admin/unreplied')}
            className="bg-white rounded-xl shadow-sm p-4 text-left hover:shadow-md transition"
          >
            <div className="text-2xl mb-2">⚠️</div>
            <h4 className="font-medium text-gray-800">导师未回复</h4>
            <p className="text-sm text-gray-500">检测连续两周未回复</p>
          </button>
        </div>
      </main>

      {/* 晚交导出弹窗 */}
      {showLateExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  第{lastWeek.weekNumber}周晚交名单
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  共 {lateReports.length} 人晚交
                </p>
              </div>
              <button
                onClick={() => setShowLateExportModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* 晚交人员列表 */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingLate ? (
                <div className="text-center py-8 text-gray-500">加载中...</div>
              ) : lateReports.length === 0 ? (
                <div className="text-center py-8 text-gray-500">🎉 该周没有晚交记录！</div>
              ) : (
                <div className="space-y-4">
                  {/* 一区队 */}
                  {lateReports.filter(r => r.student.squad === '一区队').length > 0 && (
                    <div>
                      <h4 className="font-medium text-orange-800 mb-2">
                        一区队 ({lateReports.filter(r => r.student.squad === '一区队').length}人)
                      </h4>
                      <div className="bg-orange-50 rounded-lg divide-y">
                        {lateReports
                          .filter(r => r.student.squad === '一区队')
                          .map((report) => (
                            <div key={report.id} className="p-3 flex items-center justify-between">
                              <div>
                                <span className="font-medium text-gray-900">{report.student.name}</span>
                                <span className="text-gray-700 text-sm ml-2">({report.student.student_id})</span>
                                <span className="text-gray-600 text-sm ml-3">导师：{report.student.advisor}</span>
                              </div>
                              <span className="text-xs text-gray-500">
                                {new Date(report.submitted_at).toLocaleString('zh-CN')}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* 二区队 */}
                  {lateReports.filter(r => r.student.squad === '二区队').length > 0 && (
                    <div>
                      <h4 className="font-medium text-orange-800 mb-2">
                        二区队 ({lateReports.filter(r => r.student.squad === '二区队').length}人)
                      </h4>
                      <div className="bg-orange-50 rounded-lg divide-y">
                        {lateReports
                          .filter(r => r.student.squad === '二区队')
                          .map((report) => (
                            <div key={report.id} className="p-3 flex items-center justify-between">
                              <div>
                                <span className="font-medium text-gray-900">{report.student.name}</span>
                                <span className="text-gray-700 text-sm ml-2">({report.student.student_id})</span>
                                <span className="text-gray-600 text-sm ml-3">导师：{report.student.advisor}</span>
                              </div>
                              <span className="text-xs text-gray-500">
                                {new Date(report.submitted_at).toLocaleString('zh-CN')}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 导出按钮 */}
            <div className="p-6 border-t space-y-4">
              {/* Excel导出 */}
              <div>
                <h4 className="font-medium text-gray-700 mb-3">📊 导出Excel名单</h4>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => handleExportLateExcel('一区队')}
                    disabled={lateReports.filter(r => r.student.squad === '一区队').length === 0}
                    className="px-4 py-3 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed flex flex-col items-center gap-1"
                  >
                    <span className="text-lg">📊</span>
                    <span className="text-sm font-medium">一区队</span>
                  </button>
                  <button
                    onClick={() => handleExportLateExcel('二区队')}
                    disabled={lateReports.filter(r => r.student.squad === '二区队').length === 0}
                    className="px-4 py-3 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed flex flex-col items-center gap-1"
                  >
                    <span className="text-lg">📊</span>
                    <span className="text-sm font-medium">二区队</span>
                  </button>
                  <button
                    onClick={() => handleExportLateExcel()}
                    disabled={lateReports.length === 0}
                    className="px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition disabled:bg-gray-300 disabled:cursor-not-allowed flex flex-col items-center gap-1"
                  >
                    <span className="text-lg">📊</span>
                    <span className="text-sm font-medium">全部</span>
                  </button>
                </div>
              </div>

              {/* 签名导出 */}
              <div>
                <h4 className="font-medium text-gray-700 mb-3">📁 导出签名压缩包</h4>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => handleExportLateSignatures('一区队')}
                    disabled={lateReports.filter(r => r.student.squad === '一区队' && r.signature).length === 0}
                    className="px-4 py-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed flex flex-col items-center gap-1"
                  >
                    <span className="text-lg">📁</span>
                    <span className="text-sm font-medium">一区队</span>
                  </button>
                  <button
                    onClick={() => handleExportLateSignatures('二区队')}
                    disabled={lateReports.filter(r => r.student.squad === '二区队' && r.signature).length === 0}
                    className="px-4 py-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed flex flex-col items-center gap-1"
                  >
                    <span className="text-lg">📁</span>
                    <span className="text-sm font-medium">二区队</span>
                  </button>
                  <button
                    onClick={() => handleExportLateSignatures()}
                    disabled={lateReports.filter(r => r.signature).length === 0}
                    className="px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:bg-gray-300 disabled:cursor-not-allowed flex flex-col items-center gap-1"
                  >
                    <span className="text-lg">📁</span>
                    <span className="text-sm font-medium">全部</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
