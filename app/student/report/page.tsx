import { Suspense } from 'react'
import StudentReportForm from './StudentReportForm'

// 强制按请求动态渲染，避免 ?refill=1 被静态缓存吃掉
export const dynamic = 'force-dynamic'

export default async function StudentReportPage({
  searchParams,
}: {
  searchParams: Promise<{ refill?: string; week?: string; year?: string }>
}) {
  const params = await searchParams
  const isRefillMode = params.refill === '1'

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">加载中...</div>
      </div>
    }>
      <StudentReportForm isRefillMode={isRefillMode} />
    </Suspense>
  )
}
