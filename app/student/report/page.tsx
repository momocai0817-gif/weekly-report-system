'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getCurrentWeek, formatDateTime } from '@/lib/utils'
import SignatureCanvas from '@/components/SignatureCanvas'

function StudentReportContent() {
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
    professor_replied: false,
    reply_details: '',
    not_contacted_reason: '',
    // 结构化字段
    preparation_work: '',
    question_list: '',
    advisor_feedback: '',
    follow_up_plan: '',
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
          // 结构化字段
          preparation_work: data.report.preparation_work || '',
          question_list: data.report.question_list || '',
          advisor_feedback: data.report.advisor_feedback || '',
          follow_up_plan: data.report.follow_up_plan || '',
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

    // 验证：结构化字段 - 当咨询过且导师回复时
    if (formData.contacted_professor && formData.professor_replied) {
      // 验证准备工作（最少50字）
      if (!formData.preparation_work.trim()) {
        setError('请填写准备工作：详细说明你为本次咨询做了哪些准备（≥50字）')
        setSubmitting(false)
        return
      }
      if (formData.preparation_work.trim().length < 50) {
        setError(`准备工作描述需至少50字，当前${formData.preparation_work.trim().length}字`)
        setSubmitting(false)
        return
      }

      // 验证问题清单（至少2个问题）
      const questions = formData.question_list.split('\n').filter(q => q.trim().length > 0)
      if (questions.length < 2) {
        setError('请至少列出2个具体的咨询问题，每个问题一行')
        setSubmitting(false)
        return
      }

      // 验证导师反馈（最少100字）
      if (!formData.advisor_feedback.trim()) {
        setError('请填写导师反馈：记录导师的具体指导内容（≥100字）')
        setSubmitting(false)
        return
      }
      if (formData.advisor_feedback.trim().length < 100) {
        setError(`导师反馈记录需至少100字，当前${formData.advisor_feedback.trim().length}字`)
        setSubmitting(false)
        return
      }

      // 验证后续计划（最少30字）
      if (!formData.follow_up_plan.trim()) {
        setError('请填写后续计划：说明基于导师反馈的下一步行动（≥30字）')
        setSubmitting(false)
        return
      }
      if (formData.follow_up_plan.trim().length < 30) {
        setError(`后续计划需至少30字，当前${formData.follow_up_plan.trim().length}字`)
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
      // 始终使用提交接口，允许覆盖已提交的周报
      const response = await fetch('/api/report/submit', {
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

      setMessage('提交成功！')

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

          {/* 填写要求和示例 */}
          {formData.contacted_professor && formData.professor_replied && (
            <div className="space-y-4 mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">📝 填写要求</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• <strong>准备工作：</strong>详细说明你为本次咨询做了哪些准备（≥50字）</li>
                  <li>• <strong>问题清单：</strong>列出至少2个具体要咨询的问题</li>
                  <li>• <strong>导师反馈：</strong>记录导师的具体指导内容（≥100字）</li>
                  <li>• <strong>后续计划：</strong>说明基于反馈的下一步行动（≥30字）</li>
                </ul>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-800 mb-2">✅ 填写示例</h4>
                <div className="text-sm text-green-700 space-y-2">
                  <p><strong>准备工作：</strong>本周阅读了5篇关于XX的文献，整理了XX相关数据，完成了文献综述草稿，并列出了3个拟研究的问题。</p>
                  <p><strong>问题清单：</strong>
                    1. 我的研究问题是否过于宽泛？如何缩小范围？
                    2. 应该选择哪些机器学习算法进行对比？
                    3. 如何评价模型性能的指标是否合理？
                  </p>
                  <p><strong>导师反馈：</strong>导师指出我的研究问题确实过于宽泛，建议缩小范围到"基于深度学习的肺结节检测"。推荐阅读XX教授2024年的论文作为参考，并要求在方法部分增加算法复杂度分析。指导下周完成更具体的开题报告修改，重点明确创新点和可行性分析。</p>
                  <p><strong>后续计划：</strong>根据导师建议，将研究范围缩小到肺结节检测，重新查阅相关文献10篇（重点XX教授论文），下周提交修订后的开题报告，增加算法复杂度分析部分。</p>
                </div>
              </div>
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

            {/* 结构化字段 - 仅当咨询过且导师回复时显示 */}
            {formData.contacted_professor && formData.professor_replied && (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                {/* 准备工作 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    3. 准备工作 <span className="text-red-500">*</span>
                    <span className="text-gray-500 font-normal ml-2">（≥50字）</span>
                  </label>
                  <textarea
                    value={formData.preparation_work}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        preparation_work: e.target.value,
                      })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none placeholder-gray-700 text-gray-900"
                    placeholder="请详细说明你为本次咨询做了哪些准备：阅读了哪些文献/资料、整理了什么材料/数据、撰写了哪些文档/草稿等..."
                  />
                  <div className="mt-1 text-sm text-gray-500">
                    字数统计：{formData.preparation_work.trim().length}
                    {formData.preparation_work.trim().length > 0 && formData.preparation_work.trim().length < 50 && (
                      <span className="text-red-500 ml-2">需至少50字</span>
                    )}
                  </div>
                </div>

                {/* 问题清单 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    4. 问题清单 <span className="text-red-500">*</span>
                    <span className="text-gray-500 font-normal ml-2">（至少2个具体问题）</span>
                  </label>
                  <textarea
                    value={formData.question_list}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        question_list: e.target.value,
                      })
                    }
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none placeholder-gray-700 text-gray-900"
                    placeholder="请列出你准备咨询的具体问题（每个问题一行）：&#10;问题1：...&#10;问题2：...&#10;问题3：..."
                  />
                  <div className="mt-1 text-sm text-gray-500">
                    已列出：{formData.question_list.split('\n').filter(q => q.trim().length > 0).length} 个问题
                    {formData.question_list.split('\n').filter(q => q.trim().length > 0).length > 0 && formData.question_list.split('\n').filter(q => q.trim().length > 0).length < 2 && (
                      <span className="text-red-500 ml-2">需至少2个问题</span>
                    )}
                  </div>
                </div>

                {/* 导师反馈 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    5. 导师反馈 <span className="text-red-500">*</span>
                    <span className="text-gray-500 font-normal ml-2">（≥100字）</span>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none placeholder-gray-700 text-gray-900"
                    placeholder="请记录导师的具体指导内容：针对你问题的直接回答、给出的建议和意见、指出的不足和改进方向、推荐的资源或参考文献等..."
                  />
                  <div className="mt-1 text-sm text-gray-500">
                    字数统计：{formData.advisor_feedback.trim().length}
                    {formData.advisor_feedback.trim().length > 0 && formData.advisor_feedback.trim().length < 100 && (
                      <span className="text-red-500 ml-2">需至少100字</span>
                    )}
                  </div>
                </div>

                {/* 后续计划 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    6. 后续计划 <span className="text-red-500">*</span>
                    <span className="text-gray-500 font-normal ml-2">（≥30字）</span>
                  </label>
                  <textarea
                    value={formData.follow_up_plan}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        follow_up_plan: e.target.value,
                      })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none placeholder-gray-700 text-gray-900"
                    placeholder="请说明基于导师反馈的下一步计划：根据导师建议，你需要做什么？下次咨询前要完成什么？"
                  />
                  <div className="mt-1 text-sm text-gray-500">
                    字数统计：{formData.follow_up_plan.trim().length}
                    {formData.follow_up_plan.trim().length > 0 && formData.follow_up_plan.trim().length < 30 && (
                      <span className="text-red-500 ml-2">需至少30字</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 签名区域 */}
            <div className="border-t pt-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {!formData.contacted_professor ? '3. 学生签名' : formData.professor_replied ? '7. 学生签名' : '3. 学生签名'} <span className="text-red-500">*</span>
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

// 默认导出，用Suspense包裹内容
export default function StudentReportPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">加载中...</div>
      </div>
    }>
      <StudentReportContent />
    </Suspense>
  )
}
