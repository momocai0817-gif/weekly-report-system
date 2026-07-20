# 论文导师周报系统

一个用于记录学生每周与导师咨询情况的网页应用。

## 功能

### 学生端
- 姓名+学号登录（白名单验证）
- 自动匹配导师
- 填写周报：是否咨询老师、老师是否回复、具体情况说明
- 查看和修改历史记录

### 管理端
- 统计面板：查看本周提交情况
- 一键复制未交名单（格式化后方便发群）
- 导出未交名单为Excel
- 学生管理：添加/删除/修改学生和导师信息
- 查看学生周报详情
- 历史归档和统计

## 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 配置环境变量
复制 `.env.local.example` 为 `.env.local`，然后配置 Supabase 凭证：
```bash
cp .env.local.example .env.local
```

在 `.env.local` 中填入：
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. 创建 Supabase 项目
1. 访问 [supabase.com](https://supabase.com) 并创建免费项目
2. 在 SQL Editor 中执行 `supabase/init.sql` 中的脚本
3. 在 Project Settings → API 获取凭证

### 4. 导入学生数据
```bash
npx ts-node scripts/import-students.ts
```

或在 Supabase 的 Table Editor 中手动添加。

### 5. 本地运行
```bash
npm run dev
```
访问 http://localhost:3000

### 6. 部署到 Vercel
```bash
npm install -g vercel
vercel
```

按提示配置环境变量后即可部署完成。

## 默认账户

- **管理员**: 用户名 `admin`，密码 `admin123`
- **学生**: 使用名单中的姓名和学号登录

## 配置说明

| 环境变量 | 说明 | 默认值 |
|----------|------|--------|
| `ADMIN_USERNAME` | 管理员用户名 | `admin` |
| `ADMIN_PASSWORD` | 管理员密码 | `admin123` |
| `SEMESTER_START_DATE` | 学期开始日期 | `2025-02-24` |
| `WEEKLY_DEADLINE` | 每周截止时间 | `Sunday 23:59` |

## 技术栈

- **前端**: Next.js 14 + React + Tailwind CSS
- **后端**: Next.js API Routes
- **数据库**: Supabase PostgreSQL
- **部署**: Vercel

## 详细部署指南

请参阅 [DEPLOYMENT.md](./DEPLOYMENT.md) 获取完整的部署说明。

## 许可

MIT
