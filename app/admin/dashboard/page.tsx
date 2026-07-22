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

  const currentWeek = getCurrentWeek()

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

  const handleLogout = () => {
    localStorage.removeItem('user')
    router.push('/login')
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
            <p className="text-sm text-gray-500">管理端</p>
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
        {/* 当前周次信息 */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            第 {currentWeek.weekNumber} 周 ({currentWeek.year}年)
          </h2>
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
                <span className="text-gray-600">总人数</span>
                <span className="font-medium">{stats?.squad1Total || 0}</span>
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
                <span className="text-gray-600">总人数</span>
                <span className="font-medium">{stats?.squad2Total || 0}</span>
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
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
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
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
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

          {/* 区队分别导出 */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-3">按区队导出已交人员 Excel（包含问题答案和签名）：</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleExportSubmitted('一区队')}
                disabled={(stats?.squad1Submitted || 0) === 0}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
              >
                📊 导出一区队
                <span className="text-xs opacity-75">
                  ({stats?.squad1Submitted || 0}人)
                </span>
              </button>
              <button
                onClick={() => handleExportSubmitted('二区队')}
                disabled={(stats?.squad2Submitted || 0) === 0}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
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
        </div>

        {/* 快捷操作 */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
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
        </div>
      </main>
    </div>
  )
}
