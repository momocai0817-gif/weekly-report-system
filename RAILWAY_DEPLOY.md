# Railway 部署指南（推荐 - 不需要命令行）

Railway 提供从 GitHub 直接部署，完全通过网页操作。

## 部署步骤

### 1. 准备 GitHub 仓库

1. 访问 [github.com](https://github.com) 并登录
2. 创建新仓库，命名为 `weekly-report-system`
3. 上传项目文件：

```bash
cd D:/CC/weekly-report-system
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/你的用户名/weekly-report-system.git
git push -u origin main
```

### 2. 在 Railway 部署

1. 访问 [railway.app](https://railway.app)
2. 点击 **"New Project"** → **"Deploy from GitHub repo"**
3. 选择你的 `weekly-report-system` 仓库
4. Railway 会自动检测 Next.js 项目

### 3. 配置环境变量

在 Railway 项目设置中添加以下环境变量：

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://gagjnctsiyszzzlviycz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 你的 anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | 你的 service role key |
| `ADMIN_USERNAME` | `admin` |
| `ADMIN_PASSWORD` | `admin123` |
| `SEMESTER_START_DATE` | `2025-02-24` |
| `WEEKLY_DEADLINE` | `Sunday 23:59` |

### 4. 配置 Root Directory

在项目设置中，Root Directory 留空（使用根目录）

### 5. 配置 Start Command

```
npm run build && npm start
```

### 6. 部署完成

Railway 会自动部署，完成后会提供一个公网地址。

## 其他免费平台推荐

### Render.com

1. 访问 [render.com](https://render.com)
2. 连接 GitHub 账号
3. 点击 "New +" → "Web Service"
4. 选择你的 GitHub 仓库
5. 配置环境变量和启动命令
6. 部署完成

### Koyeb.com

1. 访问 [koyeb.com](https://koyeb.com)
2. 注册并连接 GitHub
3. 创建新 App，选择仓库
4. 部署

## 注意事项

所有这些平台都提供：
- ✅ 免费套餐
- ✅ 自动 HTTPS
- ✅ 公网访问
- ✅ 环境变量配置
- ✅ GitHub 集成

推荐优先尝试 Railway 或 Render，因为它们的配置最简单。
