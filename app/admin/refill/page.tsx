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
  refill_requested_at: string | null
  refill_reason: string | null
  refill_resolved_at: string | null
  refill_resolved_note: string | null
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
  const [summary, setSummary] = useState<any>(null)
  const [statusFilter, setStatusFilter] = useState<'active' | 'resolved' | 'all'>('active')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

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
    fetchRefillList()
  }, [router])

  const fetchRefillList = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/refill/list')
      const data = await response.json()
      setReports(data.reports || [])
      setSummary(data.summary)
    } catch (err) {
      console.error('获取重填列表失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    router.push('/admin/dashboard')
  }

  const handleExport = async () => {
    try {
      let url = '/api/admin/export/refill'
      const params = new URLSearchParams()
      if (statusFilter === 'active') params.set('status', 'active')
      if (statusFilter === 'resolved') params.set('status', 'resolved')
      const queryString = params.toString()
      if (queryString) url += `?${queryString}`

      const response = await fetch(url)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '导出失败')
      }

      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl

      const statusLabel =
        statusFilter === 'active' ? '待重填' :
        statusFilter === 'resolved' ? '已重填' : '全部'
      const filename = `重填名单_${statusLabel}_${currentWeek.weekNumber}周_${currentWeek.year}年.xlsx`

      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(blobUrl)

      alert(`已导出${reports.length}条重填记录\n文件名：${filename}\n请妥善保存作为学委存档。`)
    } catch (err: any) {
      alert(err.message || '导出失败')
    }
  }

  const handleCancelRefill = async (reportId: string) => {
    if (!confirm('确定要撤销该学生的重填标记吗？')) return
    try {
      const response = await fetch(`/api/admin/refill?id=${reportId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '撤销失败')
      }
      fetchRefillList()
    } catch (err: any) {
      alert(err.message || '撤销失败')
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

  // 按状态过滤
  const filteredReports = reports.filter(r => {
    if (statusFilter === 'active') return !r.refill_resolved_at
    if (statusFilter === 'resolved') return !!r.refill_resolved_at
    return true
  })

  // 按区队分组
  const squad1Reports = filteredReports.filter(r => r.student.squad === '一区队')
  const squad2Reports = filteredReports.filter(r => r.student.squad === '二区队')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-800">论文指导周报系统</h1>
            <p className="text-sm text-gray-500">重填管理</p>
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
        {/* 说明 */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-orange-800 mb-2">📋 功能说明</h3>
          <ul className="text-sm text-orange-700 space-y-1">
            <li>• 与导师核实后，若发现学生上报数据有误（虚报/瞒报/错报），可在
              <a className="text-blue-600 underline mx-1" href="/admin/reports">查看周报</a>
              页面点击「🔄 标记需重填」按钮。
            </li>
            <li>• 标记后，学生登录时会看到醒目的重填提醒，必须重新提交。</li>
            <li>• 此页面用于集中查看、导出与跟踪重填进度，并支持学委单独存档。</li>
          </ul>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-500 mb-1">总标记数</p>
            <p className="text-3xl font-bold text-gray-800">{summary?.total ?? 0}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-500 mb-1">⏳ 待学生重填</p>
            <p className="text-3xl font-bold text-orange-600">{summary?.active ?? 0}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-500 mb-1">✓ 已完成重填</p>
            <p className="text-3xl font-bold text-green-600">{summary?.resolved ?? 0}</p>
          </div>
        </div>

        {/* 筛选 + 导出 */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">状态筛选：</span>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1 text-sm rounded ${
                  statusFilter === 'active'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                待重填
              </button>
              <button
                onClick={() => setStatusFilter('resolved')}
                className={`px-3 py-1 text-sm rounded ${
                  statusFilter === 'resolved'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                已重填
              </button>
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 text-sm rounded ${
                  statusFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                全部
              </button>
            </div>
            <button
              onClick={handleExport}
              disabled={filteredReports.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
            >
              📊 导出{statusFilter === 'active' ? '待重填' : statusFilter === 'resolved' ? '已重填' : ''}名单
              <span className="text-xs opacity-75">({filteredReports.length}人)</span>
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            导出的文件请妥善保存在学委本地，作为本次重填事件的存档记录。
          </p>
        </div>

        {/* 列表 */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500">
            加载中...
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500">
            <div className="text-4xl mb-2">🎉</div>
            <p>
              {statusFilter === 'active'
                ? '当前没有待重填的学生'
                : statusFilter === 'resolved'
                  ? '暂无已重填的记录'
                  : '暂无任何重填记录'}
            </p>
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
                      onCancel={() => handleCancelRefill(r.id)}
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
                      onCancel={() => handleCancelRefill(r.id)}
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
  onCancel,
}: {
  report: RefillReport
  isExpanded: boolean
  onToggle: () => void
  onCancel: () => void
}) {
  const isActive = !report.refill_resolved_at
  const questions = report.question_list ? report.question_list.split('\n') : []

  return (
    <div className={`p-4 hover:bg-gray-50 ${isActive ? 'bg-orange-50' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-medium text-gray-900">{report.student.name}</span>
            <span className="text-sm text-gray-700">({report.student.student_id})</span>
            <span className="text-sm text-gray-600">导师：{report.student.advisor}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
              第{report.week_number}周
            </span>
            {isActive ? (
              <span className="text-xs text-orange-700 bg-orange-200 px-2 py-0.5 rounded-full">
                ⏳ 待重填
              </span>
            ) : (
              <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                ✓ 已重填
              </span>
            )}
          </div>
          <div className="mt-2 text-sm text-gray-700">
            <span className="text-gray-500">重填原因：</span>
            <span className="text-gray-800">{report.refill_reason || '（未填写）'}</span>
          </div>
          <div className="mt-1 text-xs text-gray-500">
            标记于 {report.refill_requested_at ? formatDateTime(report.refill_requested_at) : '—'}
            {report.refill_resolved_at && (
              <> · 重填于 {formatDateTime(report.refill_resolved_at)}</>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 ml-4">
          {isActive && (
            <button
              onClick={onCancel}
              className="text-xs px-2 py-1 text-orange-700 border border-orange-300 rounded hover:bg-orange-50"
            >
              撤销
            </button>
          )}
          <button
            onClick={onToggle}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {isExpanded ? '收起' : '查看原报告'}
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
          {report.refill_resolved_note && (
            <div className="p-2 bg-green-50 rounded text-sm">
              <span className="text-xs text-green-600">学生重填备注：</span>
              <p className="text-gray-800 whitespace-pre-wrap">{report.refill_resolved_note}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}