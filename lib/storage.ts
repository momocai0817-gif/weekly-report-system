/**
 * 本地文件存储（替代 Supabase Storage）
 *
 * 文件存到 <root>/storage/archives/<year>/<week>/<filename>
 * 对外的"URL"是相对路径 /api/archive/<year>/<week>/<filename>，由 app/api/archive/[...path]/route.ts 服务
 */
import { promises as fs } from 'fs'
import path from 'path'

const STORAGE_ROOT = path.join(process.cwd(), 'storage', 'archives')

export async function saveArchiveFile(
  year: number,
  week: number,
  filename: string,
  buffer: Buffer,
): Promise<string> {
  const dir = path.join(STORAGE_ROOT, String(year), String(week))
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(path.join(dir, filename), buffer)
  return `/api/archive/${year}/${week}/${filename}`
}

export async function readArchiveFile(
  archiveUrl: string,
): Promise<{ buffer: Buffer; filename: string } | null> {
  // archiveUrl 形如 /api/archive/<year>/<week>/<filename>
  const m = archiveUrl.match(/^\/api\/archive\/(\d+)\/(\d+)\/(.+)$/)
  if (!m) return null
  const [, year, week, filename] = m
  const filepath = path.join(STORAGE_ROOT, year, week, filename)
  // 防穿越
  if (!filepath.startsWith(STORAGE_ROOT)) return null
  try {
    const buffer = await fs.readFile(filepath)
    return { buffer, filename }
  } catch {
    return null
  }
}
