# 论文导师周报系统 - 部署指南

## 项目简介

这是一个用于记录学生每周与导师咨询情况的网页应用。学生可以填写周报，管理员可以查看统计和导出未交名单。

## 功能特性

### 学生端
- 姓名+学号登录（白名单验证）
- 自动匹配导师
- 填写周报：是否咨询老师、老师是否回复、具体情况说明
- 查看历史记录

### 管理端
- 统计面板：查看本周提交情况
- 一键复制未交名单（格式化后方便发群）
- 导出Excel
- 学生管理（添加/删除/修改）
- 查看周报详情
- 历史归档

## 技术栈

- **前端**: Next.js 14 + React + Tailwind CSS
- **后端**: Next.js API Routes
- **数据库**: Supabase PostgreSQL
- **部署**: Vercel（免费）

## 部署步骤

### 1. 创建 Supabase 项目

1. 访问 [supabase.com](https://supabase.com)
2. 注册并创建新项目（免费版即可）
3. 等待项目初始化完成（约2分钟）

### 2. 创建数据库表

1. 进入 Supabase 项目 → SQL Editor
2. 复制并执行 `supabase/init.sql` 中的SQL脚本
3. 确认表创建成功

### 3. 获取 Supabase 凭证

1. 进入 Project Settings → API
2. 复制以下信息：
   - Project URL
   - anon public key
   - service_role key（注意保密）

### 4. 配置环境变量

1. 复制 `.env.local.example` 为 `.env.local`
2. 填入 Supabase 凭证：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 5. 导入学生数据

1. 确保 `.env.local` 配置正确
2. 安装 ts-node（如未安装）：
   ```bash
   npm install -g ts-node typescript
   ```
3. 运行导入脚本：
   ```bash
   npx ts-node scripts/import-students.ts
   ```

或手动在 Supabase Table Editor 中添加学生。

### 6. 本地测试

```bash
npm run dev
```

访问 http://localhost:3000

- **学生登录**: 使用名单中的姓名和学号
- **管理员登录**: 用户名 `admin`，密码 `admin123`

### 7. 部署到 Vercel

#### 方法一：通过 Vercel CLI

1. 安装 Vercel CLI：
   ```bash
   npm install -g vercel
   ```

2. 登录并部署：
   ```bash
   vercel login
   vercel
   ```

3. 按提示配置环境变量

#### 方法二：通过 GitHub + Vercel 网站

1. 将代码推送到 GitHub

2. 访问 [vercel.com](https://vercel.com)
3. 点击 "Add New Project"
4. 导入你的 GitHub 仓库
5. 配置环境变量
6. 部署！

### 8. 获取公网地址

部署完成后，Vercel 会提供一个 `.vercel.app` 域名，例如：
```
https://weekly-report-system.vercel.app
```

## 环境变量说明

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase项目URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 公开密钥 | `eyJhbGc...` |
| `SUPABASE_SERVICE_ROLE_KEY` | 服务端密钥（保密） | `eyJhbGc...` |
| `ADMIN_USERNAME` | 管理员用户名 | `admin` |
| `ADMIN_PASSWORD` | 管理员密码 | `admin123` |
| `SEMESTER_START_DATE` | 学期开始日期 | `2025-02-24` |
| `WEEKLY_DEADLINE` | 每周截止时间 | `Sunday 23:59` |

## 常见问题

### Q: 如何修改管理员密码？
A: 修改 `.env.local` 中的 `ADMIN_PASSWORD` 环境变量

### Q: 如何添加/删除学生？
A: 登录管理端 → 学生管理 → 进行操作

### Q: 如何修改学期开始日期？
A: 修改 `.env.local` 中的 `SEMESTER_START_DATE`

### Q: 学生看不到自己的导师？
A: 检查学生表中的 `advisor` 字段是否正确

### Q: 导出Excel功能不工作？
A: 检查 `xlsx` 包是否已安装：`npm install xlsx`

## 文件结构

```
weekly-report-system/
├── app/
│   ├── login/              # 登录页
│   ├── student/            # 学生端
│   ├── admin/              # 管理端
│   └── api/                # API路由
├── components/             # 组件
├── lib/                    # 工具函数
├── supabase/              # 数据库初始化
├── scripts/               # 导入脚本
└── public/                # 静态文件
```

## 安全建议

1. 修改默认管理员密码
2. 不要将 `SUPABASE_SERVICE_ROLE_KEY` 提交到公开仓库
3. 定期备份 Supabase 数据
4. 使用 Supabase 的 RLS（行级安全）限制数据访问

## 更新日志

- v1.0.0 - 初始版本
  - 学生登录和周报填写
  - 管理员统计和导出功能
  - 学生管理功能
  - 历史归档功能
