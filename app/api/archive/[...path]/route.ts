import { NextRequest, NextResponse } from 'next/server'
import { readArchiveFile } from '@/lib/storage'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params
  const archiveUrl = `/api/archive/${path.join('/')}`
  const result = await readArchiveFile(archiveUrl)
  if (!result) {
    return NextResponse.json({ error: '文件不存在' }, { status: 404 })
  }

  // 简单 content-type 推断
  const ext = result.filename.split('.').pop()?.toLowerCase()
  const contentType =
    ext === 'xlsx'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : ext === 'zip'
        ? 'application/zip'
        : 'application/octet-stream'

  return new NextResponse(result.buffer as any, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(result.filename)}"`,
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
