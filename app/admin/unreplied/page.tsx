'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentWeek } from '@/lib/utils'

interface UnrepliedCase {
  student: {
    id: string
    name: string
    student_id: string
    squad: string
    advisor: string
  }
  currentWeek: number
  currentYear: number
  previousWeek: number
  previousYear: number
}

export default function AdminUnrepliedPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [cases, setCases] = useState<UnrepliedCase[]>([])
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<any>(null)

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
    fetchUnreplied()
  }, [router, selectedWeek, selectedYear])

  const fetchUnreplied = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/admin/unreplied?week=${selectedWeek}&year=${selectedYear}`
      )
      const data = await response.json()
      setCases(data.cases || [])
      setSummary(data.summary)
    } catch (err) {
      console.error('获取数据失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      const response = await fetch(
        `/api/admin/export/unreplied?week=${selectedWeek}&year=${selectedYear}`
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '导出失败')
      }

      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `导师未回复检测_第${selectedWeek}周.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(blobUrl)
    } catch (err: any) {
      alert(err.message || '导出失败')
    }
  }

  const handleBack = () => {
    router.push('/admin/dashboard')
  }

  // 按导师分组
  const advisorGroups = cases.reduce(
    (acc, item) => {
      const advisor = item.student.advisor || '未分配导师'
      if (!acc.has(advisor)) {
        acc.set(advisor, [])
      }
      acc.get(advisor)!.push(item)
      return acc
    },
    new Map<string, UnrepliedCase[]>()
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-800">
              论文指导周报系统
            </h1>
            <p className="text-sm text-gray-500">导师未回复检测</p>
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
        {/* 周次选择 */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">
                年份:
              </label>
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
              <label className="text-sm text-gray-600">
                周次:
              </label>
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
            <button
              onClick={handleExport}
              disabled={cases.length === 0}
              className="ml-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              导出Excel
            </button>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">
                检测周次
              </p>
              <p className="text-lg font-medium text-gray-800">
                第{summary?.previousWeek}周 - 第{summary?.currentWeek}周
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">
                涉及学生
              </p>
              <p className="text-lg font-medium text-red-600">
                {summary?.total || 0}人
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">
                涉及导师
              </p>
              <p className="text-lg font-medium text-gray-800">
                {advisorGroups.size}位
              </p>
            </div>
          </div>
        </div>

        {/* 结果列表 */}
        {loading ? (
          <div className="text-center py-8 text-gray-500">
            加载中...
          </div>
        ) : cases.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500">
            <div className="text-4xl mb-4">✅</div>
            <p>该检测周期内没有连续两周学生提问但导师未回复的情况</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Array.from(advisorGroups.entries()).map(([advisor, items]) => (
              <div key={advisor} className="bg-white rounded-xl shadow-sm">
                <div className="p-4 border-b flex justify-between items-center">
                  <h3 className="font-medium text-gray-800">
                    {advisor} ({items.length}人)
                  </h3>
                </div>
                <div className="divide-y">
                  {items.map((item, index) => (
                    <div
                      key={`${item.student.id}-${index}`}
                      className="p-4 hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-gray-900">
                          {item.student.name}
                        </span>
                        <span className="text-sm text-gray-700">
                          ({item.student.student_id})
                        </span>
                        <span className="text-sm text-gray-500">
                          {item.student.squad}
                        </span>
                        <span className="ml-auto text-sm text-yellow-600">
                          连续第{item.previousWeek}周-{item.currentWeek}周未回复
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
