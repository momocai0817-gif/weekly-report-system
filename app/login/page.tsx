'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [userType, setUserType] = useState<'student' | 'admin'>('student')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 学生表单
  const [studentForm, setStudentForm] = useState({
    name: '',
    studentId: '',
  })

  // 管理员表单
  const [adminForm, setAdminForm] = useState({
    username: '',
    password: '',
  })

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'student',
          ...studentForm,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '登录失败')
      }

      // 保存用户信息到 localStorage
      localStorage.setItem('user', JSON.stringify(data.user))

      // 跳转到学生端
      router.push('/student/report')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'admin',
          ...adminForm,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '登录失败')
      }

      localStorage.setItem('user', JSON.stringify(data.user))
      router.push('/admin/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* 标题 */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800">论文导师周报系统</h1>
            <p className="text-gray-500 mt-2">请选择登录方式</p>
          </div>

          {/* 登录类型切换 */}
          <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => {
                setUserType('student')
                setError('')
              }}
              className={`flex-1 py-2 rounded-md transition-colors ${
                userType === 'student'
                  ? 'bg-white text-blue-600 shadow'
                  : 'text-gray-600'
              }`}
            >
              学生登录
            </button>
            <button
              onClick={() => {
                setUserType('admin')
                setError('')
              }}
              className={`flex-1 py-2 rounded-md transition-colors ${
                userType === 'admin'
                  ? 'bg-white text-blue-600 shadow'
                  : 'text-gray-600'
              }`}
            >
              管理员登录
            </button>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* 学生登录表单 */}
          {userType === 'student' ? (
            <form onSubmit={handleStudentLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  姓名
                </label>
                <input
                  type="text"
                  required
                  value={studentForm.name}
                  onChange={(e) =>
                    setStudentForm({ ...studentForm, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-gray-900"
                  placeholder="请输入姓名"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  学号
                </label>
                <input
                  type="text"
                  required
                  value={studentForm.studentId}
                  onChange={(e) =>
                    setStudentForm({ ...studentForm, studentId: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-gray-900"
                  placeholder="请输入学号"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading ? '登录中...' : '登录'}
              </button>
            </form>
          ) : (
            /* 管理员登录表单 */
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  用户名
                </label>
                <input
                  type="text"
                  required
                  value={adminForm.username}
                  onChange={(e) =>
                    setAdminForm({ ...adminForm, username: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-gray-900"
                  placeholder="请输入用户名"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  密码
                </label>
                <input
                  type="password"
                  required
                  value={adminForm.password}
                  onChange={(e) =>
                    setAdminForm({ ...adminForm, password: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-gray-900"
                  placeholder="请输入密码"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading ? '登录中...' : '登录'}
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-gray-500">
            {userType === 'student'
              ? '请使用白名单中的姓名和学号登录'
              : '管理员专用登录入口'}
          </p>
        </div>
      </div>
    </div>
  )
}
