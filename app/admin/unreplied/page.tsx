'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentWeek } from '@/lib/utils'

interface UnrepliedDetail {
  week: number
  year: number
  contact_initiator: 'student' | 'teacher' | null
}

interface UnrepliedStudent {
  student: {
    id: string
    name: string
    student_id: string
    squad: string
    advisor: string
  }
  unrepliedDetails: UnrepliedDetail[]
  unrepliedWeeks: number[]
  total: number
  currentStreak: number
  maxStreak: number
}

interface AdvisorGroup {
  advisor: string
  students: UnrepliedStudent[]
  studentCount: number
  maxStreak: number
}

export default function AdminUnrepliedPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [advisors, setAdvisors] = useState<AdvisorGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<any>(null)
  // 仅看连续两周及以上未回复的
  const [onlyConsecutive, setOnlyConsecutive] = useState(false)

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
      setAdvisors(data.advisors || [])
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

  // 「仅连续两周及以上」过滤
  const visibleAdvisors: AdvisorGroup[] = onlyConsecutive
    ? advisors
        .map((g) => ({
          ...g,
          students: g.students.filter((s) => s.currentStreak >= 2),
        }))
        .filter((g) => g.students.length > 0)
    : advisors

  const visibleStudentCount = visibleAdvisors.reduce((n, g) => n + g.students.length, 0)

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
          <div className="flex items-center gap-4 flex-wrap">
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
                截止周:
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
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyConsecutive}
                onChange={(e) => setOnlyConsecutive(e.target.checked)}
                className="w-4 h-4 accent-red-600"
              />
              只看连续两周及以上未回复
            </label>
            <button
              onClick={handleExport}
              disabled={visibleStudentCount === 0}
              className="ml-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              导出Excel
            </button>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">检测范围</p>
              <p className="text-lg font-medium text-gray-800">
                第{summary?.scanFromWeek}周 - 第{summary?.currentWeek}周
              </p>
              <p className="text-xs text-gray-400 mt-1">从开学第一次提交起累计</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">涉及导师</p>
              <p className="text-lg font-medium text-gray-800">
                {summary?.advisorCount || 0}位
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">有未回复情况的学生</p>
              <p className="text-lg font-medium text-gray-800">
                {summary?.total || 0}人
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">连续两周及以上未回复</p>
              <p className="text-lg font-medium text-red-600">
                {summary?.consecutiveTotal || 0}人
              </p>
            </div>
          </div>
        </div>

        {/* 结果列表：按导师分组 */}
        {loading ? (
          <div className="text-center py-8 text-gray-500">
            加载中...
          </div>
        ) : visibleAdvisors.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500">
            <div className="text-4xl mb-4">✅</div>
            <p>
              {onlyConsecutive
                ? '没有「连续两周及以上学生提问但导师未回复」的情况'
                : '该检测范围内没有学生提问但导师未回复的情况'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {visibleAdvisors.map(({ advisor, students, maxStreak }) => (
              <div key={advisor} className="bg-white rounded-xl shadow-sm">
                <div className="p-4 border-b flex justify-between items-center">
                  <h3 className="font-medium text-gray-800">
                    导师：{advisor}
                    <span className="text-sm text-gray-500 font-normal ml-2">
                      {students.length}名学生有未回复
                    </span>
                  </h3>
                  {maxStreak >= 2 && (
                    <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full">
                      最长连续{maxStreak}周未回复
                    </span>
                  )}
                </div>
                <div className="divide-y">
                  {students.map((item) => (
                    <div
                      key={item.student.id}
                      className="p-4 hover:bg-gray-50"
                    >
                      <div className="flex items-start gap-3 flex-wrap">
                        <div className="flex items-center gap-3 min-w-[220px]">
                          <span className="font-medium text-gray-900">
                            {item.student.name}
                          </span>
                          <span className="text-sm text-gray-700">
                            ({item.student.student_id})
                          </span>
                          <span className="text-sm text-gray-500">
                            {item.student.squad}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap flex-1">
                          <span className="text-xs text-gray-500 mr-1">
                            未回复周次：
                          </span>
                          {item.unrepliedDetails.map((d) => (
                            <span
                              key={`${d.year}-${d.week}`}
                              title={
                                d.contact_initiator === 'student'
                                  ? '学生主动联系'
                                  : d.contact_initiator === 'teacher'
                                    ? '老师主动联系'
                                    : ''
                              }
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                d.contact_initiator === 'teacher'
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}
                            >
                              第{d.week}周
                            </span>
                          ))}
                        </div>
                        <div className="ml-auto text-right shrink-0">
                          {item.currentStreak >= 2 ? (
                            <span className="text-sm text-red-600 font-medium">
                              连续{item.currentStreak}周未回复
                            </span>
                          ) : (
                            <span className="text-sm text-gray-500">
                              累计{item.total}周未回复
                            </span>
                          )}
                        </div>
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
