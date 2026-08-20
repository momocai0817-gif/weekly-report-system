'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentWeek, formatDateTime } from '@/lib/utils'

interface Report {
  id: string
  student: {
    name: string
    student_id: string
    squad: string
    advisor: string
  }
  week_number: number
  year: number
  contacted_professor: boolean
  contact_initiator?: 'student' | 'teacher' | null
  professor_replied: boolean | null
  reply_details: string | null
  not_contacted_reason: string | null
  signature: string | null
  submitted_at: string
  // 新增结构化字段
  preparation_work?: string | null
  question_list?: string | null
  advisor_feedback?: string | null
  // 重填相关
  needs_refill?: boolean
  refill_requested_at?: string | null
  refill_reason?: string | null
  refill_resolved_at?: string | null
  refill_resolved_note?: string | null
}

export default function AdminReportsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [refillModalOpen, setRefillModalOpen] = useState(false)
  const [refillTarget, setRefillTarget] = useState<Report | null>(null)
  const [refillReason, setRefillReason] = useState('')
  const [refillSubmitting, setRefillSubmitting] = useState(false)

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
    fetchReports()
  }, [router, selectedWeek, selectedYear])

  const fetchReports = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/admin/reports?week=${selectedWeek}&year=${selectedYear}`
      )
      const data = await response.json()
      setReports(data.reports || [])
    } catch (err) {
      console.error('获取周报失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    router.push('/admin/dashboard')
  }

  const openRefillModal = (report: Report) => {
    setRefillTarget(report)
    setRefillReason('')
    setRefillModalOpen(true)
  }

  const closeRefillModal = () => {
    if (refillSubmitting) return
    setRefillModalOpen(false)
    setRefillTarget(null)
    setRefillReason('')
  }

  const submitRefill = async () => {
    if (!refillTarget) return
    setRefillSubmitting(true)
    try {
      const response = await fetch('/api/admin/refill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: refillTarget.id,
          reason: refillReason.trim() || null,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || '标记失败')
      }
      alert('已通知学生重新填写')
      closeRefillModal()
      fetchReports()
    } catch (err: any) {
      alert(err.message || '标记失败')
    } finally {
      setRefillSubmitting(false)
    }
  }

  const cancelRefill = async (report: Report) => {
    if (!confirm('确定要撤销该学生的重填标记吗？')) return
    try {
      const response = await fetch(
        `/api/admin/refill?id=${report.id}`,
        { method: 'DELETE' }
      )
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '撤销失败')
      }
      fetchReports()
    } catch (err: any) {
      alert(err.message || '撤销失败')
    }
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
            <p className="text-sm text-gray-500">查看周报</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/admin/refill')}
              className="text-sm px-3 py-1 text-orange-600 hover:text-orange-800 border border-orange-300 rounded hover:bg-orange-50"
            >
              🔄 重填管理
            </button>
            <button
              onClick={handleBack}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              ← 返回
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* 周次选择 */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex items-center gap-4">
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
            <span className="text-gray-500 ml-4">
              共 {reports.length} 份报告
              {reports.filter(r => r.needs_refill).length > 0 && (
                <span className="text-orange-600 ml-2">
                  · 标记重填 {reports.filter(r => r.needs_refill).length} 人
                </span>
              )}
            </span>
          </div>
        </div>

        {/* 报告列表 */}
        {loading ? (
          <div className="text-center py-8 text-gray-500">加载中...</div>
        ) : reports.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500">
            该周暂无周报提交
          </div>
        ) : (
          <>
            {/* 一区队 */}
            {squad1Reports.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm mb-4">
                <h2 className="font-medium text-gray-800 p-4 border-b">
                  一区队 ({squad1Reports.length}人)
                </h2>
                <div className="divide-y">
                  {squad1Reports.map((report) => (
                    <ReportCard
                      key={report.id}
                      report={report}
                      onMarkRefill={() => openRefillModal(report)}
                      onCancelRefill={() => cancelRefill(report)}
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
                  {squad2Reports.map((report) => (
                    <ReportCard
                      key={report.id}
                      report={report}
                      onMarkRefill={() => openRefillModal(report)}
                      onCancelRefill={() => cancelRefill(report)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* 重填标记弹窗 */}
        {refillModalOpen && refillTarget && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4"
            onClick={closeRefillModal}
          >
            <div
              className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                🔄 标记学生需重新填写
              </h3>
              <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
                <p className="text-gray-700">
                  <strong>{refillTarget.student.name}</strong>
                  <span className="text-gray-500 ml-2">
                    ({refillTarget.student.student_id})
                  </span>
                </p>
                <p className="text-gray-500 mt-1">
                  导师：{refillTarget.student.advisor} · {refillTarget.student.squad}
                </p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  重填原因（可选，将展示给学生）
                </label>
                <textarea
                  value={refillReason}
                  onChange={(e) => setRefillReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none resize-none placeholder-gray-500 text-gray-900"
                  placeholder="例如：经与导师核实，本周并未咨询；或问题清单与实际情况不符……"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={closeRefillModal}
                  disabled={refillSubmitting}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  onClick={submitRefill}
                  disabled={refillSubmitting}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                >
                  {refillSubmitting ? '标记中...' : '确认标记'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function ReportCard({
  report,
  onMarkRefill,
  onCancelRefill,
}: {
  report: Report
  onMarkRefill: () => void
  onCancelRefill: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const isRefillActive = report.needs_refill && !report.refill_resolved_at
  const isRefillResolved = report.needs_refill && report.refill_resolved_at

  return (
    <div className={`p-4 hover:bg-gray-50 ${isRefillActive ? 'bg-orange-50' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-medium text-gray-900">{report.student.name}</span>
            <span className="text-sm text-gray-700">
              ({report.student.student_id})
            </span>
            <span className="text-sm text-gray-600">
              导师：{report.student.advisor}
            </span>
            {isRefillActive && (
              <span className="text-xs text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                ⚠ 待学生重新填写
              </span>
            )}
            {isRefillResolved && (
              <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                ✓ 已重填
              </span>
            )}
          </div>
          <div className="mt-2 flex items-center gap-2 flex-wrap text-sm">
            <span
              className={`px-2 py-0.5 rounded-full ${
                report.contacted_professor
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {report.contacted_professor ? '已咨询' : '未咨询'}
            </span>
            {report.contacted_professor && (
              <>
                <span
                  className={`px-2 py-0.5 rounded-full ${
                    report.contact_initiator === 'student'
                      ? 'bg-blue-100 text-blue-700'
                      : report.contact_initiator === 'teacher'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {report.contact_initiator === 'student'
                    ? '学生主动联系'
                    : report.contact_initiator === 'teacher'
                      ? '老师主动联系'
                      : '未注明'}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full ${
                    report.professor_replied
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {report.professor_replied ? '已回复' : '未回复'}
                </span>
              </>
            )}
            <span className="text-gray-400 text-xs">
              提交于 {formatDateTime(report.submitted_at)}
            </span>
            {isRefillActive && report.refill_requested_at && (
              <span className="text-xs text-orange-600">
                · 标记于 {formatDateTime(report.refill_requested_at)}
              </span>
            )}
            {isRefillResolved && report.refill_resolved_at && (
              <span className="text-xs text-green-600">
                · 重填于 {formatDateTime(report.refill_resolved_at)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 ml-4">
          {isRefillActive ? (
            <button
              onClick={onCancelRefill}
              className="text-xs px-2 py-1 text-orange-700 border border-orange-300 rounded hover:bg-orange-50"
            >
              撤销重填
            </button>
          ) : (
            <button
              onClick={onMarkRefill}
              className="text-xs px-2 py-1 text-orange-600 border border-orange-300 rounded hover:bg-orange-50"
              title="与导师核实后发现数据有误时使用"
            >
              🔄 标记需重填
            </button>
          )}
          {(report.contacted_professor || report.not_contacted_reason || report.signature || report.preparation_work || report.question_list || report.advisor_feedback) && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {expanded ? '收起' : '展开详情'}
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="mt-3 space-y-3">
          {isRefillActive && report.refill_reason && (
            <div className="p-3 bg-orange-100 rounded-lg">
              <p className="text-xs text-orange-700 mb-1">📌 重填原因（已通知学生）：</p>
              <p className="text-sm text-orange-800 whitespace-pre-wrap">
                {report.refill_reason}
              </p>
            </div>
          )}
          {isRefillResolved && report.refill_resolved_note && (
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-xs text-green-700 mb-1">✓ 学生重填备注：</p>
              <p className="text-sm text-green-800 whitespace-pre-wrap">
                {report.refill_resolved_note}
              </p>
            </div>
          )}
          {report.not_contacted_reason && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">未咨询原因/所处阶段：</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                {report.not_contacted_reason}
              </p>
            </div>
          )}
          {report.reply_details && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">具体情况说明：</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                {report.reply_details}
              </p>
            </div>
          )}
          {/* 结构化字段 */}
          {report.preparation_work && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-600 mb-1">准备工作：</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                {report.preparation_work}
              </p>
            </div>
          )}
          {report.question_list && (
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-xs text-green-600 mb-1">问题清单：</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                {report.question_list}
              </p>
            </div>
          )}
          {report.advisor_feedback && (
            <div className="p-3 bg-purple-50 rounded-lg">
              <p className="text-xs text-purple-600 mb-1">导师反馈：</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                {report.advisor_feedback}
              </p>
            </div>
          )}
          {report.signature && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-2">学生签名：</p>
              <img
                src={report.signature}
                alt="学生签名"
                className="h-16 bg-white border border-gray-200 rounded"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}