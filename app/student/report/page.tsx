'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentWeek, formatDateTime } from '@/lib/utils'
import SignatureCanvas from '@/components/SignatureCanvas'

export default function StudentReportPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const currentWeek = getCurrentWeek()

  // 表单状态
  const [formData, setFormData] = useState({
    contacted_professor: false,
    professor_replied: false,
    reply_details: '',
    not_contacted_reason: '',
  })

  // 签名状态
  const [signature, setSignature] = useState('')

  // 检查本周是否已提交
  const [existingReport, setExistingReport] = useState<any>(null)

  useEffect(() => {
    // 检查登录状态
    const userStr = localStorage.getItem('user')
    if (!userStr) {
      router.push('/login')
      return
    }

    const userData = JSON.parse(userStr)
    if (userData.role !== 'student') {
      router.push('/login')
      return
    }

    setUser(userData)
    checkExistingReport(userData.id)
  }, [router])

  const checkExistingReport = async (studentId: string) => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/report/check?studentId=${studentId}&week=${currentWeek.weekNumber}&year=${currentWeek.year}`
      )
      const data = await response.json()

      if (data.report) {
        setExistingReport(data.report)
        setFormData({
          contacted_professor: data.report.contacted_professor,
          professor_replied: data.report.professor_replied || false,
          reply_details: data.report.reply_details || '',
          not_contacted_reason: data.report.not_contacted_reason || '',
        })
        // 加载已有的签名
        if (data.report.signature) {
          setSignature(data.report.signature)
        }
      }
    } catch (err) {
      console.error('检查报告失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setMessage('')

    // 验证：第一题选"否"时必须填写原因
    if (!formData.contacted_professor && !formData.not_contacted_reason.trim()) {
      setError('请填写未咨询导师的原因或现处阶段')
      setSubmitting(false)
      return
    }

    // 验证：第一题选"是"且第二题选"是"时必须填写具体情况说明
    if (formData.contacted_professor && formData.professor_replied && !formData.reply_details.trim()) {
      setError('请填写第3题：具体情况说明（50-100字）')
      setSubmitting(false)
      return
    }

    // 验证：具体情况说明字数限制（50-100字）
    if (formData.contacted_professor && formData.professor_replied && formData.reply_details.trim()) {
      const wordCount = formData.reply_details.trim().length
      if (wordCount < 50 || wordCount > 100) {
        setError(`具体情况说明需在50-100字之间，当前${wordCount}字`)
        setSubmitting(false)
        return
      }
    }

    // 验证签名
    if (!signature) {
      setError('请先完成签名')
      setSubmitting(false)
      return
    }

    try {
      const endpoint = existingReport
        ? `/api/report/update?id=${existingReport.id}`
        : '/api/report/submit'

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: user.id,
          weekNumber: currentWeek.weekNumber,
          year: currentWeek.year,
          ...formData,
          signature,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '提交失败')
      }

      setMessage(existingReport ? '更新成功！' : '提交成功！')

      if (!existingReport) {
        setExistingReport(data.report)
      }

      setTimeout(() => setMessage(''), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-800">论文指导周报系统</h1>
            <p className="text-sm text-gray-500">学生端</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-800">{user?.name}</p>
              <p className="text-xs text-gray-600">{user?.squad}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              退出
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* 当前周次信息 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="font-medium text-blue-800">
                第 {currentWeek.weekNumber} 周 ({currentWeek.year}年)
              </h2>
              <p className="text-sm text-blue-600 mt-1">
                导师：{user?.advisor}
              </p>
            </div>
            {existingReport && (
              <span className="text-sm text-green-600 bg-green-100 px-3 py-1 rounded-full">
                已提交
              </span>
            )}
          </div>
          {existingReport && (
            <p className="text-xs text-gray-500 mt-2">
              提交时间：{formatDateTime(existingReport.submitted_at)}
            </p>
          )}
        </div>

        {/* 提示消息 */}
        {message && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-600">
            {message}
          </div>
        )}

        {/* 错误消息 */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600">
            {error}
          </div>
        )}

        {/* 周报表单 */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-800 mb-6">
            {existingReport ? '修改周报' : '填写本周周报'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 问题1：是否咨询过老师 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                1. 本周是否咨询过导师问题？
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="contacted"
                    value="yes"
                    checked={formData.contacted_professor === true}
                    onChange={() =>
                      setFormData({
                        ...formData,
                        contacted_professor: true,
                      })
                    }
                    className="mr-2"
                  />
                  <span className="text-gray-800">是</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="contacted"
                    value="no"
                    checked={formData.contacted_professor === false}
                    onChange={() =>
                      setFormData({
                        ...formData,
                        contacted_professor: false,
                        professor_replied: false,
                        reply_details: '',
                      })
                    }
                    className="mr-2"
                  />
                  <span className="text-gray-800">否</span>
                </label>
              </div>
            </div>

            {/* 未咨询原因 */}
            {!formData.contacted_professor && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  2. 请说明未咨询导师的原因或当前所处阶段 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.not_contacted_reason}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      not_contacted_reason: e.target.value,
                    })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none placeholder-gray-700 text-gray-900"
                  placeholder="请说明未咨询导师的原因，或描述当前论文写作进度/所处阶段..."
                />
              </div>
            )}

            {/* 问题2：老师是否回复 */}
            {formData.contacted_professor && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  2. 导师是否回复？
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="replied"
                      value="yes"
                      checked={formData.professor_replied === true}
                      onChange={() =>
                        setFormData({
                          ...formData,
                          professor_replied: true,
                        })
                      }
                      className="mr-2"
                    />
                    <span className="text-gray-800">是</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="replied"
                      value="no"
                      checked={formData.professor_replied === false}
                      onChange={() =>
                        setFormData({
                          ...formData,
                          professor_replied: false,
                        })
                      }
                      className="mr-2"
                    />
                    <span className="text-gray-800">否</span>
                  </label>
                </div>
              </div>
            )}

            {/* 具体情况说明 - 仅当咨询过且导师回复时显示 */}
            {formData.contacted_professor && formData.professor_replied && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  3. 具体情况说明 <span className="text-red-500">*</span>
                  <span className="text-gray-500 font-normal ml-2">（50-100字）</span>
                </label>
                <textarea
                  value={formData.reply_details}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      reply_details: e.target.value,
                    })
                  }
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none placeholder-gray-700 text-gray-900"
                  placeholder="请描述咨询的内容和导师的回复情况..."
                />
                <div className="mt-1 text-sm text-gray-500">
                  字数统计：{formData.reply_details.trim().length}/100
                  {formData.reply_details.trim().length > 0 && (formData.reply_details.trim().length < 50 || formData.reply_details.trim().length > 100) && (
                    <span className="text-red-500 ml-2">需在50-100字之间</span>
                  )}
                </div>
              </div>
            )}

            {/* 签名区域 */}
            <div className="border-t pt-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {!formData.contacted_professor ? '3. 学生签名' : formData.professor_replied ? '4. 学生签名' : '3. 学生签名'} <span className="text-red-500">*</span>
              </label>
              <SignatureCanvas
                value={signature}
                onChange={setSignature}
                disabled={submitting}
              />
            </div>

            {/* 提交按钮 */}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {submitting ? '提交中...' : existingReport ? '更新周报' : '提交周报'}
              </button>
              {existingReport && (
                <button
                  type="button"
                  onClick={() => router.push('/student/history')}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  查看历史
                </button>
              )}
            </div>
          </form>
        </div>

        {/* 提示信息 */}
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>提示：</strong>每周周报请于周日 23:59 前完成提交。如有问题请联系学委。
          </p>
        </div>
      </main>
    </div>
  )
}
