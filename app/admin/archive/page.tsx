'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentWeek } from '@/lib/utils'

interface WeekSummary {
  week: number
  year: number
  total: number
  submitted: number
  rate: number
}

export default function AdminArchivePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [summaries, setSummaries] = useState<WeekSummary[]>([])
  const [loading, setLoading] = useState(true)

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
    fetchSummaries()
  }, [router])

  const fetchSummaries = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/archive')
      const data = await response.json()
      setSummaries(data.summaries || [])
    } catch (err) {
      console.error('获取归档数据失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    router.push('/admin/dashboard')
  }

  const handleViewWeek = (week: number, year: number) => {
    router.push(`/admin/reports?week=${week}&year=${year}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-800">论文导师周报系统</h1>
            <p className="text-sm text-gray-500">历史归档</p>
          </div>
          <button
            onClick={handleBack}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            ← 返回
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-4 border-b">
            <h2 className="font-medium text-gray-800">周报提交记录</h2>
            <p className="text-sm text-gray-500 mt-1">
              查看每周的提交统计和详情
            </p>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">加载中...</div>
          ) : summaries.length === 0 ? (
            <div className="p-8 text-center text-gray-500">暂无记录</div>
          ) : (
            <div className="divide-y">
              {summaries.map((summary) => {
                const isCurrentWeek =
                  summary.week === currentWeek.weekNumber &&
                  summary.year === currentWeek.year

                return (
                  <div
                    key={`${summary.year}-${summary.week}`}
                    className="p-4 hover:bg-gray-50 flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-gray-800">
                          第 {summary.week} 周
                        </span>
                        <span className="text-sm text-gray-500">
                          {summary.year}年
                        </span>
                        {isCurrentWeek && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            本周
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                        <span>提交: {summary.submitted}/{summary.total}</span>
                        <span>
                          提交率: <span className="font-medium">{summary.rate}%</span>
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleViewWeek(summary.week, summary.year)}
                      className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 border border-blue-600 rounded hover:bg-blue-50 transition"
                    >
                      查看详情
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
