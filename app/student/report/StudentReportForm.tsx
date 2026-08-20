'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getCurrentWeek, formatDateTime } from '@/lib/utils'
import SignatureCanvas from '@/components/SignatureCanvas'

export default function StudentReportForm({ isRefillMode }: { isRefillMode: boolean }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const currentWeek = getCurrentWeek()

  // 支持通过URL参数指定周次（如 ?week=23&year=2026）
  const targetWeek = searchParams.get('week')
  const targetYear = searchParams.get('year')
  const displayWeek = targetWeek && targetYear
    ? { weekNumber: parseInt(targetWeek), year: parseInt(targetYear) }
    : currentWeek

  // 表单状态
  const [formData, setFormData] = useState({
    contacted_professor: false,
    contact_initiator: null as 'student' | 'teacher' | null,
    professor_replied: false,
    reply_details: '',
    not_contacted_reason: '',
    preparation_work: '',
    questions: ['', ''],
    advisor_feedback: '',
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
        // 将 question_list 转换为 questions 数组
        const existingQuestions = data.report.question_list
          ? data.report.question_list.split('\n').slice(0, 2)
          : ['', '']
        // 补齐到2个问题
        while (existingQuestions.length < 2) {
          existingQuestions.push('')
        }

        setFormData({
          contacted_professor: data.report.contacted_professor,
          contact_initiator: data.report.contact_initiator || null,
          professor_replied: data.report.professor_replied || false,
          reply_details: data.report.reply_details || '',
          not_contacted_reason: data.report.not_contacted_reason || '',
          preparation_work: data.report.preparation_work || '',
          questions: existingQuestions,
          advisor_feedback: data.report.advisor_feedback || '',
        })
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

    // 验证：咨询时必须选择联系发起方
    if (formData.contacted_professor && !formData.contact_initiator) {
      setError('请选择：是你主动联系老师，还是老师主动联系的你？')
      setSubmitting(false)
      return
    }

    // 验证：准备工作和问题清单 - 只要咨询过就必填
    if (formData.contacted_professor) {
      // 验证准备工作（最少30字）
      if (!formData.preparation_work.trim()) {
        setError('请填写准备工作：详细描述你为本次咨询所做的准备工作（≥30字）')
        setSubmitting(false)
        return
      }
      if (formData.preparation_work.trim().length < 30) {
        setError(`准备工作描述需至少30字，当前${formData.preparation_work.trim().length}字`)
        setSubmitting(false)
        return
      }

      // 验证问题清单（至少1个问题）
      const validQuestions = formData.questions.filter(q => q.trim().length > 0)
      if (validQuestions.length < 1) {
        setError('请至少列出1个本周已向导师咨询过的具体问题')
        setSubmitting(false)
        return
      }

      // 验证导师反馈 - 只有导师回复时才必填
      if (formData.professor_replied) {
        // 验证导师反馈（最少30字）
        if (!formData.advisor_feedback.trim()) {
          setError('请填写导师反馈：记录导师的具体指导内容（≥30字）')
          setSubmitting(false)
          return
        }
        if (formData.advisor_feedback.trim().length < 30) {
          setError(`导师反馈记录需至少30字，当前${formData.advisor_feedback.trim().length}字`)
          setSubmitting(false)
          return
        }
      }
    }

    // 验证签名
    if (!signature) {
      setError('请先完成签名')
      setSubmitting(false)
      return
    }

    try {
      const response = await fetch('/api/report/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: user.id,
          weekNumber: currentWeek.weekNumber,
          year: currentWeek.year,
          ...formData,
          question_list: formData.questions.filter(q => q.trim()).join('\n'),
          signature,
          isRefill: isRefillMode,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '提交失败')
      }

      setMessage(isRefillMode ? '重填提交成功！感谢你配合重新填写。' : '提交成功！')

      setExistingReport(data.report)
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

  const theme = {
    headerBanner: isRefillMode ? 'bg-orange-50 border-orange-300' : 'bg-blue-50 border-blue-200',
    headerTitle: isRefillMode ? 'text-orange-800' : 'text-blue-800',
    headerSub: isRefillMode ? 'text-orange-600' : 'text-blue-600',
    submitBtn: isRefillMode ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700',
    submitLabel: isRefillMode ? '提交重填' : (existingReport ? '更新周报' : '提交周报'),
    pageTitle: isRefillMode ? '重填本周周报' : (existingReport ? '修改周报' : '填写本周周报'),
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-800">论文指导周报系统</h1>
            <p className="text-sm text-gray-500">
              {isRefillMode ? '重填通道' : '学生端'}
            </p>
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
        <div className={`border rounded-lg p-4 mb-6 ${theme.headerBanner}`}>
          <div className="flex justify-between items-center">
            <div>
              <h2 className={`font-medium ${theme.headerTitle}`}>
                第 {currentWeek.weekNumber} 周 ({currentWeek.year}年)
              </h2>
              <p className={`text-sm mt-1 ${theme.headerSub}`}>
                导师：{user?.advisor}
              </p>
            </div>
            {isRefillMode ? (
              <span className="text-sm text-orange-700 bg-orange-200 px-3 py-1 rounded-full">
                🔄 重填
              </span>
            ) : (
              existingReport && (
                <span className="text-sm text-green-600 bg-green-100 px-3 py-1 rounded-full">
                  已提交
                </span>
              )
            )}
          </div>
          {existingReport && !isRefillMode && (
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
          <h3 className="text-lg font-medium text-gray-800 mb-6">{theme.pageTitle}</h3>

          {/* 填写要求 */}
          {formData.contacted_professor && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-blue-800 mb-2">📝 填写要求</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• <strong>联系发起方：</strong>请如实选择是你主动联系还是老师主动联系</li>
                <li>• <strong>准备工作：</strong>详细描述你为本次咨询所做的准备工作（≥30字）</li>
                <li>• <strong>问题清单：</strong>列出至少1个本周已向导师咨询过的具体问题</li>
                {formData.professor_replied && (
                  <li>• <strong>导师反馈：</strong>记录导师的具体指导内容（≥30字）</li>
                )}
              </ul>
            </div>
          )}

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
                        contact_initiator: null,
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none placeholder-gray-500 text-gray-900"
                  placeholder="请说明未咨询导师的原因，或描述当前论文写作进度/所处阶段..."
                />
              </div>
            )}

            {/* 联系发起方选择 */}
            {formData.contacted_professor && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  2. 这次联系，是你主动联系老师，还是老师主动联系的你？
                  <span className="text-red-500">*</span>
                </label>
                <div className="p-4 bg-white border border-gray-200 rounded-lg space-y-3">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <label className={`flex-1 flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition ${
                      formData.contact_initiator === 'student'
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-blue-300 bg-white'
                    }`}>
                      <input
                        type="radio"
                        name="contact_initiator"
                        value="student"
                        checked={formData.contact_initiator === 'student'}
                        onChange={() =>
                          setFormData({
                            ...formData,
                            contact_initiator: 'student',
                          })
                        }
                        className="mr-1"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-800">
                          我主动联系老师
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          本周由我发起，向导师请教问题
                        </div>
                      </div>
                    </label>
                    <label className={`flex-1 flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition ${
                      formData.contact_initiator === 'teacher'
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-blue-300 bg-white'
                    }`}>
                      <input
                        type="radio"
                        name="contact_initiator"
                        value="teacher"
                        checked={formData.contact_initiator === 'teacher'}
                        onChange={() =>
                          setFormData({
                            ...formData,
                            contact_initiator: 'teacher',
                          })
                        }
                        className="mr-1"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-800">
                          老师主动联系我
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          本周由导师主动找我沟通指导
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* 问题3：老师是否回复 */}
            {formData.contacted_professor && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  3. 导师是否回复？
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

            {/* 准备工作和问题清单 - 仅当咨询过时显示 */}
            {formData.contacted_professor && (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                {/* 准备工作 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    4. 准备工作 <span className="text-red-500">*</span>
                    <span className="text-gray-500 font-normal ml-2">（≥30字）</span>
                  </label>
                  <textarea
                    value={formData.preparation_work}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        preparation_work: e.target.value,
                      })
                    }
                    rows={5}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none placeholder-gray-500 text-gray-900"
                    placeholder="请详细描述你为本次咨询所做的准备工作：包括研读的文献资料、梳理的数据或笔记、撰写的草稿或大纲，以及除查阅外的其他实践环节（如访谈情况、问卷设计、代码调试等），请确保内容详实。"
                  />
                  <div className="mt-1 text-sm text-gray-500">
                    {formData.preparation_work.trim().length}/30
                    {formData.preparation_work.trim().length > 0 && formData.preparation_work.trim().length < 30 && (
                      <span className="text-red-500 ml-2">需至少30字</span>
                    )}
                  </div>
                </div>

                {/* 问题清单 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    5. 问题清单 <span className="text-red-500">*</span>
                    <span className="text-gray-500 font-normal ml-2">（本周已咨询过的至少1个具体问题）</span>
                  </label>
                  <div className="space-y-2">
                    {[0, 1].map((index) => (
                      <div key={index}>
                        <label className="block text-xs text-gray-600 mb-1">
                          问题 {index + 1}
                        </label>
                        <input
                          type="text"
                          value={formData.questions[index]}
                          onChange={(e) => {
                            const newQuestions = [...formData.questions]
                            newQuestions[index] = e.target.value
                            setFormData({
                              ...formData,
                              questions: newQuestions,
                            })
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none placeholder-gray-500 text-gray-900"
                          placeholder={`请输入本周已向导师咨询过的第${index + 1}个问题...`}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-1 text-sm text-gray-500">
                    已填写：{formData.questions.filter(q => q.trim().length > 0).length}/1
                    {formData.questions.filter(q => q.trim().length > 0).length > 0 && formData.questions.filter(q => q.trim().length > 0).length < 1 && (
                      <span className="text-red-500 ml-2">需至少1个问题</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 导师反馈 - 仅当咨询过且导师回复时显示 */}
            {formData.contacted_professor && formData.professor_replied && (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    6. 导师反馈 <span className="text-red-500">*</span>
                    <span className="text-gray-500 font-normal ml-2">（≥30字）</span>
                  </label>
                  <textarea
                    value={formData.advisor_feedback}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        advisor_feedback: e.target.value,
                      })
                    }
                    rows={5}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none placeholder-gray-500 text-gray-900"
                    placeholder="请记录导师的具体指导内容：针对你问题的直接回答、给出的建议和意见、指出的不足和改进方向、推荐的资源或参考文献等..."
                  />
                  <div className="mt-1 text-sm text-gray-500">
                    {formData.advisor_feedback.trim().length}/30
                    {formData.advisor_feedback.trim().length > 0 && formData.advisor_feedback.trim().length < 30 && (
                      <span className="text-red-500 ml-2">需至少30字</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 签名区域 */}
            <div className="border-t pt-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {(() => {
                  if (!formData.contacted_professor) return '3. 学生签名'
                  if (!formData.professor_replied) return '6. 学生签名'
                  return '7. 学生签名'
                })()} <span className="text-red-500">*</span>
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
                className={`flex-1 text-white py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition ${theme.submitBtn}`}
              >
                {submitting ? '提交中...' : theme.submitLabel}
              </button>
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
