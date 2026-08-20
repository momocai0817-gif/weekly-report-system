/**
 * 自建 Postgres 兼容层
 *
 * 保留与原 @supabase/supabase-js 完全一致的 API 表面：
 *   createServiceClient().from(table).select/insert/update/delete().eq/in().order().single()
 *
 * 底层用 node-postgres (pg) 直连，PostgREST 风格链式调用全部翻译成 SQL。
 * 因为所有调用都在 Next.js API 路由里（服务端），不需要 client 端的 SSR helper。
 */
import { Pool, type PoolClient } from 'pg'

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgres://weekly:weekly_app_2026@127.0.0.1:5432/weekly_report',
  max: 10,
  idleTimeoutMillis: 30_000,
})

// 工具：把 JS 值转成 pg 参数
function param(value: any) {
  if (value === undefined) return null
  if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
    return JSON.stringify(value)
  }
  return value
}

// 构造 WHERE 片段
function buildWhere(filters: Filter[]): { sql: string; params: any[] } {
  if (filters.length === 0) return { sql: '', params: [] }
  const parts: string[] = []
  const params: any[] = []
  for (const f of filters) {
    if (f.type === 'eq') {
      params.push(param(f.val))
      parts.push(`${quoteIdent(f.col)} = $${params.length}`)
    } else if (f.type === 'in') {
      const arr = (f.val as any[]).map((v) => param(v))
      if (arr.length === 0) {
        parts.push('FALSE')
      } else {
        // 用展开的 $N 占位符而不是 ANY(text[])，这样 PostgreSQL 能从列类型推断参数类型
        const placeholders: string[] = []
        for (const v of arr) {
          params.push(v)
          placeholders.push(`$${params.length}`)
        }
        parts.push(`${quoteIdent(f.col)} IN (${placeholders.join(',')})`)
      }
    } else if (f.type === 'is') {
      parts.push(`${quoteIdent(f.col)} IS ${f.val === null ? 'NULL' : 'TRUE'}`)
    }
  }
  return { sql: 'WHERE ' + parts.join(' AND '), params }
}

function quoteIdent(name: string): string {
  // 简单 identifier 安全：只允许字母数字下划线
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`非法列名: ${name}`)
  }
  return `"${name}"`
}

function buildOrder(orders: Order[]): string {
  if (orders.length === 0) return ''
  return (
    'ORDER BY ' +
    orders
      .map(
        (o) => `${quoteIdent(o.col)} ${o.ascending ? 'ASC' : 'DESC'} NULLS LAST`,
      )
      .join(', ')
  )
}

type Filter =
  | { type: 'eq'; col: string; val: any }
  | { type: 'in'; col: string; val: any[] }
  | { type: 'is'; col: string; val: any }

type Order = { col: string; ascending: boolean }

interface QueryResult<T = any> {
  data: T | null
  error: { message: string; code?: string } | null
  count?: number
}

interface QueryResultArray {
  data: any[]
  error: { message: string; code?: string } | null
  count?: number
}

class QueryChain<T = any> implements PromiseLike<QueryResultArray> {
  private _table: string
  private _mode: 'select' | 'insert' | 'update' | 'delete' = 'select'
  private _cols = '*'
  private _payload: any = null
  private _filters: Filter[] = []
  private _orders: Order[] = []
  private _terminal: 'none' | 'single' | 'maybeSingle' = 'none'

  constructor(table: string) {
    this._table = table
  }

  select(cols: string = '*'): this {
    if (this._mode === 'select') this._cols = cols
    return this
  }
  insert(data: any): this {
    this._mode = 'insert'
    this._payload = data
    return this
  }
  update(data: any): this {
    this._mode = 'update'
    this._payload = data
    return this
  }
  delete(): this {
    this._mode = 'delete'
    return this
  }
  eq(col: string, val: any): this {
    this._filters.push({ type: 'eq', col, val })
    return this
  }
  in(col: string, vals: any[]): this {
    this._filters.push({ type: 'in', col, val: vals })
    return this
  }
  is(col: string, val: any): this {
    this._filters.push({ type: 'is', col, val })
    return this
  }
  order(col: string, opts: { ascending?: boolean } = {}): this {
    this._orders.push({ col, ascending: opts.ascending !== false })
    return this
  }
  single(): SingleChain<T> {
    this._terminal = 'single'
    return this as unknown as SingleChain<T>
  }
  maybeSingle(): SingleChain<T | null> {
    this._terminal = 'maybeSingle'
    return this as unknown as SingleChain<T | null>
  }

  async _exec(client?: PoolClient): Promise<QueryResultArray> {
    const conn = client ?? pool
    try {
      let rows: any[] = []
      if (this._mode === 'select') {
        const w = buildWhere(this._filters)
        const o = buildOrder(this._orders)
        const sqlText =
          `SELECT ${this._cols} FROM ${quoteIdent(this._table)} ${w.sql} ${o}`.trim()
        const res = await conn.query(sqlText, w.params)
        rows = res.rows
      } else if (this._mode === 'insert') {
        const { cols, placeholders, vals } = buildInsert(this._payload)
        const sqlText = `INSERT INTO ${quoteIdent(this._table)} (${cols}) VALUES ${placeholders} RETURNING *`
        const res = await conn.query(sqlText, vals)
        rows = res.rows
      } else if (this._mode === 'update') {
        const w = buildWhere(this._filters)
        const { setSql, vals } = buildSet(this._payload)
        const fullVals = [...vals, ...w.params]
        const sqlText = `UPDATE ${quoteIdent(this._table)} SET ${setSql} ${w.sql} RETURNING *`
        const res = await conn.query(sqlText, fullVals)
        rows = res.rows
      } else if (this._mode === 'delete') {
        const w = buildWhere(this._filters)
        const res = await conn.query(
          `DELETE FROM ${quoteIdent(this._table)} ${w.sql}`,
          w.params,
        )
        rows = res.rows
      }

      // 终端模式
      if (this._terminal === 'single') {
        if (rows.length === 0) {
          return {
            data: null,
            error: { message: 'No rows found', code: 'PGRST116' },
          } as any
        }
        return { data: rows[0], error: null } as any
      }
      if (this._terminal === 'maybeSingle') {
        return { data: (rows[0] ?? null) as any, error: null }
      }
      return { data: rows, error: null }
    } catch (err: any) {
      return {
        data: null,
        error: { message: err.message, code: err.code },
      } as any
    }
  }

  // 让 await 直接可用
  then<R1 = QueryResultArray, R2 = never>(
    onfulfilled?: ((v: QueryResultArray) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((e: any) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    return this._exec().then(onfulfilled as any, onrejected as any)
  }
}

interface SingleChain<T> extends PromiseLike<QueryResult<T>> {
  // same shape, just narrows the resolved type
}

function buildInsert(obj: Record<string, any>): {
  cols: string
  placeholders: string
  vals: any[]
} {
  const keys = Object.keys(obj)
  const cols = keys.map(quoteIdent).join(', ')
  // VALUES 必须是括号包裹的参数列表，避免生成 `VALUES $1, $2` 这种缺括号语法
  const placeholders = `(${keys.map((_, i) => `$${i + 1}`).join(', ')})`
  const vals = keys.map((k) => param(obj[k]))
  return { cols, placeholders, vals }
}

function buildSet(obj: Record<string, any>): {
  setSql: string
  vals: any[]
} {
  const keys = Object.keys(obj)
  const parts = keys.map((k, i) => `${quoteIdent(k)} = $${i + 1}`).join(', ')
  const vals = keys.map((k) => param(obj[k]))
  return { setSql: parts, vals }
}

// === 兼容原 supabase 导出名 ===
export function createSupabaseClient() {
  return { from: (t: string) => new QueryChain(t) }
}
export function createServiceClient() {
  return { from: (t: string) => new QueryChain(t) }
}

// 类型定义保持不变
export interface Student {
  id: string
  name: string
  student_id: string
  squad: string
  advisor: string
  created_at: string
}

export interface WeeklyReport {
  id: string
  student_id: string
  week_number: number
  year: number
  contacted_professor: boolean
  professor_replied: boolean | null
  reply_details: string | null
  signature: string | null
  submitted_at: string
}

export interface Admin {
  id: string
  username: string
  created_at: string
}
