'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Student {
  id: string
  name: string
  student_id: string
  squad: string
  advisor: string
}

export default function AdminStudentsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [message, setMessage] = useState('')

  // 新增/编辑学生表单
  const [formData, setFormData] = useState({
    name: '',
    student_id: '',
    squad: '一区队',
    advisor: '',
  })

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
    fetchStudents()
  }, [router])

  const fetchStudents = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/students')
      const data = await response.json()
      setStudents(data.students || [])
    } catch (err) {
      console.error('获取学生列表失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingStudent(null)
    setFormData({ name: '', student_id: '', squad: '一区队', advisor: '' })
    setShowAddModal(true)
  }

  const handleEdit = (student: Student) => {
    setEditingStudent(student)
    setFormData({
      name: student.name,
      student_id: student.student_id,
      squad: student.squad,
      advisor: student.advisor,
    })
    setShowAddModal(true)
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定要删除学生 "${name}" 吗？`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/students?id=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('删除失败')
      }

      setMessage('删除成功')
      setTimeout(() => setMessage(''), 2000)
      fetchStudents()
    } catch (err) {
      alert('删除失败')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const url = editingStudent
        ? `/api/admin/students?id=${editingStudent.id}`
        : '/api/admin/students'

      const response = await fetch(url, {
        method: editingStudent ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '操作失败')
      }

      setMessage(editingStudent ? '更新成功' : '添加成功')
      setTimeout(() => setMessage(''), 2000)
      setShowAddModal(false)
      fetchStudents()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleBack = () => {
    router.push('/admin/dashboard')
  }

  const squad1Students = students.filter(s => s.squad === '一区队')
  const squad2Students = students.filter(s => s.squad === '二区队')

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
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-800">论文导师周报系统</h1>
            <p className="text-sm text-gray-500">学生管理</p>
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
        {/* 操作栏 */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-gray-600">
            共 {students.length} 名学生
          </div>
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            + 添加学生
          </button>
        </div>

        {/* 提示消息 */}
        {message && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-600">
            {message}
          </div>
        )}

        {/* 一区队 */}
        <div className="bg-white rounded-xl shadow-sm mb-6">
          <h2 className="font-medium text-gray-800 p-4 border-b">一区队 ({squad1Students.length}人)</h2>
          <div className="divide-y">
            {squad1Students.map((student) => (
              <div
                key={student.id}
                className="flex items-center justify-between p-4 hover:bg-gray-50"
              >
                <div className="flex-1">
                  <span className="font-medium">{student.name}</span>
                  <span className="text-gray-500 text-sm ml-2">
                    ({student.student_id})
                  </span>
                </div>
                <div className="flex-1 text-gray-600">
                  导师：{student.advisor}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(student)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(student.id, student.name)}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
            {squad1Students.length === 0 && (
              <p className="p-4 text-center text-gray-500">暂无学生</p>
            )}
          </div>
        </div>

        {/* 二区队 */}
        <div className="bg-white rounded-xl shadow-sm">
          <h2 className="font-medium text-gray-800 p-4 border-b">二区队 ({squad2Students.length}人)</h2>
          <div className="divide-y">
            {squad2Students.map((student) => (
              <div
                key={student.id}
                className="flex items-center justify-between p-4 hover:bg-gray-50"
              >
                <div className="flex-1">
                  <span className="font-medium">{student.name}</span>
                  <span className="text-gray-500 text-sm ml-2">
                    ({student.student_id})
                  </span>
                </div>
                <div className="flex-1 text-gray-600">
                  导师：{student.advisor}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(student)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(student.id, student.name)}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
            {squad2Students.length === 0 && (
              <p className="p-4 text-center text-gray-500">暂无学生</p>
            )}
          </div>
        </div>
      </main>

      {/* 添加/编辑模态框 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              {editingStudent ? '编辑学生' : '添加学生'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  姓名
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  学号
                </label>
                <input
                  type="text"
                  required
                  value={formData.student_id}
                  onChange={(e) =>
                    setFormData({ ...formData, student_id: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  区队
                </label>
                <select
                  value={formData.squad}
                  onChange={(e) =>
                    setFormData({ ...formData, squad: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="一区队">一区队</option>
                  <option value="二区队">二区队</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  导师
                </label>
                <input
                  type="text"
                  required
                  value={formData.advisor}
                  onChange={(e) =>
                    setFormData({ ...formData, advisor: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  {editingStudent ? '更新' : '添加'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
