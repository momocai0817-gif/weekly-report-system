// 从 Supabase REST API 拉取所有数据，导入到本地 PostgreSQL
// 运行：node scripts/import-from-supabase.mjs

import 'dotenv/config'
import { config } from 'dotenv'
config({ path: '.env.local' })
import pg from 'pg'

const SUPABASE_URL = 'https://gagjnctsiyszzzlviycz.supabase.co'
const SERVICE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhZ2puY3RzaXlzenp6bHZpeWN6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDU3MjEzNSwiZXhwIjoyMTAwMTQ4MTM1fQ._Osm7k58IK7Th4SyJg6aTQ6III8ALm_Be5e0RYvjq1w'

async function fetchAll(table) {
  const all = []
  const pageSize = 1000
  let offset = 0
  while (true) {
    const url = `${SUPABASE_URL}/rest/v1/${table}?select=*&offset=${offset}&limit=${pageSize}`
    const res = await fetch(url, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
    })
    if (!res.ok) throw new Error(`${table} fetch ${res.status}: ${await res.text()}`)
    const rows = await res.json()
    if (!Array.isArray(rows) || rows.length === 0) break
    all.push(...rows)
    if (rows.length < pageSize) break
    offset += pageSize
  }
  return all
}

async function insertRows(pool, table, rows) {
  if (rows.length === 0) return
  const cols = Object.keys(rows[0])
  // 安全列名
  const safeCols = cols.filter((c) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(c))
  let inserted = 0
  // 分批插入，每批 100 行
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100)
    const valuesSql = batch
      .map(
        (_, r) =>
          `(${safeCols.map((__, c) => `$${r * safeCols.length + c + 1}`).join(',')})`,
      )
      .join(',')
    const flat = batch.flatMap((row) =>
      safeCols.map((c) => {
        const v = row[c]
        if (v === null || v === undefined) return null
        if (typeof v === 'object') return JSON.stringify(v)
        return v
      }),
    )
    const sql = `INSERT INTO ${table} (${safeCols.join(',')}) VALUES ${valuesSql} ON CONFLICT DO NOTHING`
    await pool.query(sql, flat)
    inserted += batch.length
  }
  return inserted
}

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

  console.log('清空本地表…')
  await pool.query('TRUNCATE TABLE weekly_reports, students, admins, weekly_archives RESTART IDENTITY CASCADE')

  for (const table of ['students', 'weekly_reports', 'admins', 'weekly_archives']) {
    process.stdout.write(`拉取 ${table}… `)
    const rows = await fetchAll(table)
    console.log(`${rows.length} 行`)
    if (rows.length > 0) {
      // 修复外键：weekly_reports.student_id 应该引用 students.id；两者 id 都是 uuid，不变
      // 但 weekly_reports 中可能引用了 Supabase 那边的 students id，我们直接复制过来
      const n = await insertRows(pool, table, rows)
      console.log(`  → 插入 ${n} 行`)
    }
  }

  // 验证
  const r = await pool.query(
    'SELECT (SELECT count(*) FROM students) AS s, (SELECT count(*) FROM weekly_reports) AS r, (SELECT count(*) FROM weekly_archives) AS a',
  )
  console.log('\n本地数据库现状:', r.rows[0])

  await pool.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})