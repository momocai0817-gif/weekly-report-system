@echo off
chcp 65001 >nul
echo ========================================
echo    一键部署到 Railway
echo ========================================
echo.
echo 此脚本会帮您完成 GitHub 和 Railway 部署
echo.

cd /d "%~dp0"

echo ========================================
echo 第 1 步：推送到 GitHub
echo ========================================
echo.
echo 请按提示操作：
echo.
echo 1. 访问 https://github.com/new 创建仓库
echo 2. 仓库名输入: weekly-report-system
echo 3. 点击 Create repository
echo 4. 复制下面显示的命令到 GitHub 页面运行
echo.
echo ========================================
echo 请运行以下命令:
echo ========================================
echo.
echo git remote add origin https://github.com/你的用户名/weekly-report-system.git
echo git branch -M main
echo git push -u origin main
echo.
echo 替换 "你的用户名" 为你的 GitHub 用户名
echo.
pause

echo.
echo ========================================
echo 第 2 步：在 Railway 部署
echo ========================================
echo.
echo 1. 访问 https://railway.app
echo 2. 点击登录 (使用 GitHub)
echo 3. 点击 "New Project" → "Deploy from GitHub repo"
echo 4. 选择 weekly-report-system
echo 5. 添加环境变量 (见下方)
echo 6. 点击 Deploy
echo.
echo ========================================
echo 环境变量配置:
echo ========================================
echo.
echo NEXT_PUBLIC_SUPABASE_URL = https://gagjnctsiyszzzlviycz.supabase.co
echo NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGc...
echo SUPABASE_SERVICE_ROLE_KEY = eyJhbGc...
echo ADMIN_USERNAME = admin
echo ADMIN_PASSWORD = admin123
echo SEMESTER_START_DATE = 2025-02-24
echo WEEKLY_DEADLINE = Sunday 23:59
echo.
echo ========================================
echo 需要帮助? 打开 RAILWAY_DEPLOY.md 查看详细步骤
echo ========================================
echo.

start "" RAILWAY_DEPLOY.md

pause
