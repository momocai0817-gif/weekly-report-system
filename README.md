# 论文导师周报系统

一个用于记录学生每周与导师咨询情况的网页应用。学生每周填写「本周是否联系导师、导师是否回复、具体情况」，老师从管理端查看提交情况、识别未回复记录、导出归档。

## 功能

### 学生端
- 姓名 + 学号登录（白名单验证）
- 自动匹配导师
- 填写周报：是否联系老师、老师是否回复、具体情况说明
- 查看和修改历史记录

### 管理端（`/admin/*`）
- **统计面板** `/admin/dashboard` —— 本周提交概览
- **学生管理** `/admin/students` —— 添加 / 删除 / 修改学生与导师信息
- **查看周报** `/admin/reports` —— 学生详情、联系发起方（学生/老师）徽章、未记录项可补录
- **未提交名单** `/admin/unsubmitted` —— 一键复制 / 导出 Excel
- **导师未回复检测** `/admin/unreplied` —— 按导师分组，列出连续 / 累计未回复周数，可按「连续两周及以上」筛选，按导师分 sheet 导出 Excel
- **周报补交** `/admin/refill` —— 补录历史周报
- **历史归档** `/admin/archive` —— 每周一键生成 `submitted.xlsx` + `unsubmitted.xlsx` + `signatures.zip`，写入 `storage/archives/<年>/<周>/`

### 工具脚本（`scripts/`）
- `import-from-supabase.mjs` —— 从 Supabase REST 拉全量数据到本地 PG（首次迁移用）
- `export-squad-archive.mjs` —— 按区队导出周报存档：`node scripts/export-squad-archive.mjs <周> <年> <区队>`，写到 `storage/archives/<年>/<周>/<区队名>/` 并复制到 `/root/exports/<年>-W<周>-<区队>/`

## 技术栈

- **前端**：Next.js 16（App Router）+ React 19 + Tailwind CSS
- **后端**：Next.js API Routes（Node.js runtime）
- **数据库**：本地 PostgreSQL 14，库 `weekly_report`，用户 `weekly`
- **驱动**：`pg`（直接连接，无 ORM）
- **Excel 导出**：`xlsx`（`jszip` 处理签名 zip）
- **进程管理**：pm2（生产环境，监听 6010）
- **对外网络**：Cloudflare Tunnel（域名 `paper-weekly-report.xyz`）

> 早期版本曾使用 Supabase + Vercel，已于 2026-08-20 完全迁出。代码中保留了名为 `lib/supabase.ts` 的兼容层（用 `pg.Pool` 实现，API 链兼容 `.from().select().eq().in().single()`），18 个 API 路由零改动。

## 快速开始（开发环境）

### 前置条件
- Node.js 20+
- PostgreSQL 14+

### 1. 克隆与安装
```bash
git clone git@github.com:momocai0817-gif/weekly-report-system.git
cd weekly-report-system
npm install
```

### 2. 准备数据库
```bash
sudo -u postgres psql -c "CREATE USER weekly WITH PASSWORD 'weekly_app_2026';"
sudo -u postgres psql -c "CREATE DATABASE weekly_report OWNER weekly;"
PGPASSWORD=weekly_app_2026 psql -U weekly -h 127.0.0.1 -d weekly_report -f supabase/schema-clean.sql
```

### 3. 配置环境变量
复制示例并填写：
```bash
cp .env.local.example .env.local   # 如未提供示例，按下方「环境变量」一节创建
```

最少需要：
```env
DATABASE_URL=postgres://weekly:weekly_app_2026@127.0.0.1:5432/weekly_report
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<自行设置>
```

### 4. 启动开发服务
```bash
npm run dev
# 默认监听 http://localhost:3000
```

## 数据库 Schema

`supabase/schema-clean.sql` 是迁移后的标准 schema（4 表 + 2 视图），已应用到生产。

迁移目录：`supabase/migrations/` 含历史增量脚本；`supabase/init.sql` 是更早的初版，**不要在新部署上使用**（已被 `schema-clean.sql` 取代）。

## 环境变量

| 变量 | 必填 | 说明 | 默认值 |
|---|---|---|---|
| `DATABASE_URL` | 是 | PostgreSQL 连接字符串 | （代码 fallback 到 `postgres://weekly:weekly_app_2026@127.0.0.1:5432/weekly_report`） |
| `ADMIN_USERNAME` | 否 | 管理端用户名 | （代码内默认值，见 `lib/supabase.ts`） |
| `ADMIN_PASSWORD` | 否 | 管理端密码 | （**务必在生产环境显式设置**，不要依赖默认值） |
| `SEMESTER_START_DATE` | 否 | 学期开始日期（ISO 字符串） | `2025-02-24` |
| `WEEKLY_DEADLINE` | 否 | 周报截止时间（cron 风格字符串，服务端使用） | `Monday 23:59` |
| `NEXT_PUBLIC_SITE_URL` | 否 | 对外访问 URL（客户端 bundle 使用） | （无） |
| `CRON_SECRET_KEY` | 否 | 内部接口鉴权密钥（如归档生成接口） | （无） |

> 周次切分规则：截止时间后的提交归入下一个周桶。例如 `WEEKLY_DEADLINE=Monday 23:59` 意味着周二补交自动算下一周。
> 客户端 bundle 不注入服务端 env，周次显示走 `lib/utils.ts` 的默认值——两处必须保持一致。

## 生产部署

本项目运行在单台服务器，由 pm2 托管：

```bash
# 构建
npm run build

# pm2 启动
pm2 start npm --name weekly-report -- start
pm2 save

# 开机 / 重启后恢复
pm2 resurrect
```

容器环境无 systemd，`pg_ctlcluster 14 main start` 需手动启动 PG。

对外域名通过 Cloudflare Tunnel 暴露，详见 `cloudflared` / tunnel 配置文件（部署相关不进仓库）。

## 项目结构

```
app/
  api/            # Next.js API 路由（archive / backup / export / refill / reports / stats / students / unreplied / unsubmitted）
  admin/          # 管理端页面（dashboard / students / reports / unreplied / archive / refill / unsubmitted）
lib/
  supabase.ts     # pg.Pool + 兼容 supabase-js 链式 API
  storage.ts      # 本地文件系统存储（替代 Supabase Storage）
  utils.ts        # 周次 / 截止时间 / 学期工具
supabase/
  schema-clean.sql  # 标准 schema（部署用这个）
  init.sql          # 历史初版（已弃用）
  migrations/       # 历史增量脚本
scripts/
  import-from-supabase.mjs    # 首次迁移：Supabase REST → 本地 PG
  export-squad-archive.mjs    # 按区队导出周报存档
storage/
  archives/<年>/<周>/   # 归档产物（提交名单 / 未交名单 / 签名 zip），gitignored
backups/                 # 历史 Supabase 备份 JSON，gitignored
```

## 许可

MIT