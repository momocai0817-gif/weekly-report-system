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
  professor_replied: boolean | null
  reply_details: string | null
  not_contacted_reason: string | null
  signature: string | null
  submitted_at: string
}

export default function LateReportsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [lateReports, setLateReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

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
    fetchLateReports()
  }, [router, selectedWeek, selectedYear])

  const fetchLateReports = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/admin/late-reports?week=${selectedWeek}&year=${selectedYear}`
      )
      const data = await response.json()
      setLateReports(data.lateReports || [])
    } catch (err) {
      console.error('获取晚交名单失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    router.push('/admin/dashboard')
  }

  const exportLateReports = () => {
    if (lateReports.length === 0) return

    const XLSX = require('xlsx')
    const headers = ['姓名', '学号', '区队', '导师', '周次', '是否咨询导师', '导师是否回复', '提交时间']

    const rows = lateReports.map(report => [
      report.student.name,
      report.student.student_id,
      report.student.squad,
      report.student.advisor,
      `${report.year}年第${report.week_number}周`,
      report.contacted_professor ? '是' : '否',
      report.contacted_professor ? (report.professor_replied ? '是' : '否') : '-',
      formatDateTime(report.submitted_at)
    ])

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
    worksheet['!cols'] = [
      { wch: 12 },
      { wch: 15 },
      { wch: 10 },
      { wch: 12 },
      { wch: 15 },
      { wch: 12 },
      { wch: 12 },
      { wch: 20 },
    ]

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '晚交名单')
    XLSX.writeFile(workbook, `${selectedYear}年第${selectedWeek}周-晚交名单.xlsx`)
  }

  // 按区队分组
  const squad1Late = lateReports.filter(r => r.student.squad === '一区队')
  const squad2Late = lateReports.filter(r => r.student.squad === '二区队')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-800">论文指导周报系统</h1>
            <p className="text-sm text-gray-500">晚交名单</p>
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
            <div className="ml-auto flex gap-2">
              <button
                onClick={exportLateReports}
                disabled={lateReports.length === 0}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
              >
                📊 导出晚交名单
              </button>
            </div>
          </div>
        </div>

        {/* 晚交统计 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-orange-50 rounded-xl shadow-sm p-6 border border-orange-200">
            <p className="text-sm text-orange-600 mb-1">晚交总人数</p>
            <p className="text-3xl font-bold text-orange-700">{lateReports.length}</p>
          </div>
          <div className="bg-orange-50 rounded-xl shadow-sm p-6 border border-orange-200">
            <p className="text-sm text-orange-600 mb-1">一区队晚交</p>
            <p className="text-3xl font-bold text-orange-700">{squad1Late.length}</p>
          </div>
          <div className="bg-orange-50 rounded-xl shadow-sm p-6 border border-orange-200">
            <p className="text-sm text-orange-600 mb-1">二区队晚交</p>
            <p className="text-3xl font-bold text-orange-700">{squad2Late.length}</p>
          </div>
        </div>

        {/* 晚交列表 */}
        {loading ? (
          <div className="text-center py-8 text-gray-500">加载中...</div>
        ) : lateReports.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500">
            🎉 该周没有晚交记录！
          </div>
        ) : (
          <>
            {/* 一区队晚交 */}
            {squad1Late.length > 0 && (
              <div className="bg-orange-50 rounded-xl shadow-sm mb-4 border border-orange-200">
                <h2 className="font-medium text-orange-800 p-4 border-b border-orange-200">
                  一区队 - 晚交 ({squad1Late.length}人)
                </h2>
                <div className="divide-y">
                  {squad1Late.map((report) => (
                    <ReportCard key={report.id} report={report} />
                  ))}
                </div>
              </div>
            )}

            {/* 二区队晚交 */}
            {squad2Late.length > 0 && (
              <div className="bg-orange-50 rounded-xl shadow-sm border border-orange-200">
                <h2 className="font-medium text-orange-800 p-4 border-b border-orange-200">
                  二区队 - 晚交 ({squad2Late.length}人)
                </h2>
                <div className="divide-y">
                  {squad2Late.map((report) => (
                    <ReportCard key={report.id} report={report} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

function ReportCard({ report }: { report: Report }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="p-4 hover:bg-orange-100 transition">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="font-medium text-gray-900">{report.student.name}</span>
            <span className="text-sm text-gray-700">
              ({report.student.student_id})
            </span>
            <span className="text-sm text-gray-600">
              导师：{report.student.advisor}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-4 text-sm">
            <span className="px-2 py-0.5 rounded-full bg-orange-200 text-orange-800 text-xs font-medium">
              晚交
            </span>
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
              <span
                className={`px-2 py-0.5 rounded-full ${
                  report.professor_replied
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {report.professor_replied ? '已回复' : '未回复'}
              </span>
            )}
            <span className="text-gray-400 text-xs">
              提交于 {formatDateTime(report.submitted_at)}
            </span>
          </div>
        </div>
        {(report.contacted_professor || report.not_contacted_reason || report.signature) && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {expanded ? '收起' : '展开详情'}
          </button>
        )}
      </div>

      {expanded && (
        <div className="mt-3 space-y-3">
          {report.not_contacted_reason && (
            <div className="p-3 bg-white rounded-lg">
              <p className="text-xs text-gray-500 mb-1">未咨询原因/所处阶段：</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                {report.not_contacted_reason}
              </p>
            </div>
          )}
          {report.reply_details && (
            <div className="p-3 bg-white rounded-lg">
              <p className="text-xs text-gray-500 mb-1">具体情况说明：</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                {report.reply_details}
              </p>
            </div>
          )}
          {report.signature && (
            <div className="p-3 bg-white rounded-lg">
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
