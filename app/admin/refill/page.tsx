'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentWeek, formatDateTime } from '@/lib/utils'

interface RefillReport {
  id: string
  student_id: string
  week_number: number
  year: number
  contacted_professor: boolean
  contact_initiator: 'student' | 'teacher' | null
  professor_replied: boolean | null
  refill_resolved_at: string | null
  preparation_work: string | null
  question_list: string | null
  advisor_feedback: string | null
  not_contacted_reason: string | null
  submitted_at: string
  student: {
    name: string
    student_id: string
    squad: string
    advisor: string
  }
}

export default function AdminRefillPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [reports, setReports] = useState<RefillReport[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const currentWeek = getCurrentWeek()
  const [selectedWeek, setSelectedWeek] = useState(currentWeek.weekNumber)
  const [selectedYear, setSelectedYear] = useState(currentWeek.year)

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
    fetchRefillList()
  }, [router, selectedWeek, selectedYear])

  const fetchRefillList = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/admin/refill/list?week=${selectedWeek}&year=${selectedYear}`
      )
      const data = await response.json()
      setReports(data.reports || [])
    } catch (err) {
      console.error('获取重填列表失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    router.push('/admin/dashboard')
  }

  const downloadFile = async (url: string, fallbackName: string) => {
    const response = await fetch(url)
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      alert(data.error || '导出失败')
      return
    }
    const blob = await response.blob()
    const blobUrl = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = fallbackName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(blobUrl)
  }

  const handleExportReports = async (squad: '一区队' | '二区队') => {
    const url = `/api/admin/export/refill-reports?week=${selectedWeek}&year=${selectedYear}&squad=${encodeURIComponent(squad)}`
    const filename = `重填周报_${squad}_第${selectedWeek}周.xlsx`
    try {
      await downloadFile(url, filename)
    } catch (err: any) {
      alert(err.message || '导出失败')
    }
  }

  const handleExportSignatures = async (squad: '一区队' | '二区队') => {
    const url = `/api/admin/export/refill-signatures?week=${selectedWeek}&year=${selectedYear}&squad=${encodeURIComponent(squad)}`
    const filename = `重填周报_签名_${squad}_第${selectedWeek}周.zip`
    try {
      await downloadFile(url, filename)
    } catch (err: any) {
      alert(err.message || '导出失败')
    }
  }

  const toggleExpanded = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // 按区队分组
  const squad1Reports = reports.filter(r => r.student.squad === '一区队')
  const squad2Reports = reports.filter(r => r.student.squad === '二区队')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-800">论文指导周报系统</h1>
            <p className="text-sm text-gray-500">重填周报</p>
          </div>
          <button
            onClick={handleBack}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            ← 返回
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* 周次 + 导出 */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4 justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">年份:</label>
                <input
                  type="number"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                  style={{ color: '#000', WebkitTextFillColor: '#000' }}
                  min={2020}
                  max={2030}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">周次:</label>
                <div className="flex items-center">
                  <input
                    type="number"
                    value={selectedWeek}
                    onChange={(e) => setSelectedWeek(parseInt(e.target.value) || 1)}
                    className="w-16 px-2 py-1 border border-gray-300 rounded-l text-center"
                    style={{ color: '#000', WebkitTextFillColor: '#000' }}
                    min={1}
                    max={52}
                  />
                  <div className="flex flex-col border border-l-0 border-gray-300 rounded-r overflow-hidden">
                    <button
                      onClick={() => setSelectedWeek(Math.min(52, selectedWeek + 1))}
                      className="px-2 py-0.5 text-gray-600 hover:bg-gray-100 text-xs leading-none border-b border-gray-300"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => setSelectedWeek(Math.max(1, selectedWeek - 1))}
                      className="px-2 py-0.5 text-gray-600 hover:bg-gray-100 text-xs leading-none"
                    >
                      ▼
                    </button>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedWeek(currentWeek.weekNumber)
                  setSelectedYear(currentWeek.year)
                }}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                回到本周
              </button>
              <span className="text-gray-500 ml-2">
                共 {reports.length} 条重填记录
                {squad1Reports.length > 0 && <span className="ml-2">一区队 {squad1Reports.length} 人</span>}
                {squad2Reports.length > 0 && <span className="ml-2">二区队 {squad2Reports.length} 人</span>}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleExportReports('一区队')}
                disabled={squad1Reports.length === 0}
                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm flex items-center gap-1"
              >
                📊 一区队 Excel
              </button>
              <button
                onClick={() => handleExportReports('二区队')}
                disabled={squad2Reports.length === 0}
                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm flex items-center gap-1"
              >
                📊 二区队 Excel
              </button>
              <button
                onClick={() => handleExportSignatures('一区队')}
                disabled={squad1Reports.length === 0}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm flex items-center gap-1"
              >
                🖼️ 一区队签名
              </button>
              <button
                onClick={() => handleExportSignatures('二区队')}
                disabled={squad2Reports.length === 0}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm flex items-center gap-1"
              >
                🖼️ 二区队签名
              </button>
            </div>
          </div>
        </div>

        {/* 列表 */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500">
            加载中...
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500">
            <div className="text-4xl mb-2">🎉</div>
            <p>第 {selectedWeek} 周 暂无重填记录</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 一区队 */}
            {squad1Reports.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm">
                <h2 className="font-medium text-gray-800 p-4 border-b">
                  一区队 ({squad1Reports.length}人)
                </h2>
                <div className="divide-y">
                  {squad1Reports.map(r => (
                    <RefillCard
                      key={r.id}
                      report={r}
                      isExpanded={expanded.has(r.id)}
                      onToggle={() => toggleExpanded(r.id)}
                    />
                  ))}
                </div>
              </div>
            )}
            {/* 二区队 */}
            {squad2Reports.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm">
                <h2 className="font-medium text-gray-800 p-4 border-b">
                  二区队 ({squad2Reports.length}人)
                </h2>
                <div className="divide-y">
                  {squad2Reports.map(r => (
                    <RefillCard
                      key={r.id}
                      report={r}
                      isExpanded={expanded.has(r.id)}
                      onToggle={() => toggleExpanded(r.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function RefillCard({
  report,
  isExpanded,
  onToggle,
}: {
  report: RefillReport
  isExpanded: boolean
  onToggle: () => void
}) {
  const questions = report.question_list ? report.question_list.split('\n') : []

  return (
    <div className="p-4 hover:bg-gray-50 bg-green-50/50">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-medium text-gray-900">{report.student.name}</span>
            <span className="text-sm text-gray-700">({report.student.student_id})</span>
            <span className="text-sm text-gray-600">导师：{report.student.advisor}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
              第{report.week_number}周
            </span>
            <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
              ✓ 已重填
            </span>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            提交于 {formatDateTime(report.submitted_at)}
            {report.refill_resolved_at && (
              <> · 重填时间 {formatDateTime(report.refill_resolved_at)}</>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={onToggle}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {isExpanded ? '收起' : '查看报告'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-3 space-y-2">
          {report.not_contacted_reason && (
            <div className="p-2 bg-gray-50 rounded text-sm">
              <span className="text-xs text-gray-500">未咨询原因：</span>
              <p className="text-gray-800 whitespace-pre-wrap">{report.not_contacted_reason}</p>
            </div>
          )}
          {report.preparation_work && (
            <div className="p-2 bg-blue-50 rounded text-sm">
              <span className="text-xs text-blue-600">准备工作：</span>
              <p className="text-gray-800 whitespace-pre-wrap">{report.preparation_work}</p>
            </div>
          )}
          {questions.length > 0 && (
            <div className="p-2 bg-green-50 rounded text-sm">
              <span className="text-xs text-green-600">问题清单：</span>
              <ol className="list-decimal list-inside text-gray-800">
                {questions.map((q, i) => q && <li key={i}>{q}</li>)}
              </ol>
            </div>
          )}
          {report.advisor_feedback && (
            <div className="p-2 bg-purple-50 rounded text-sm">
              <span className="text-xs text-purple-600">导师反馈：</span>
              <p className="text-gray-800 whitespace-pre-wrap">{report.advisor_feedback}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
