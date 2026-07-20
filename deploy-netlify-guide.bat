@echo off
chcp 65001 >nul
cls
echo ========================================
echo    Netlify 部署向导
echo ========================================
echo.
echo 即将打开 Netlify 项目页面
echo 请按照下面的步骤操作
echo.
pause

start "" "https://app.netlify.com/projects/weekly-report-system"

timeout /t 3 >nul

cls
echo ========================================
echo    Netlify 部署步骤
echo ========================================
echo.
echo 【第 1 步】配置环境变量
echo ========================================
echo.
echo 在打开的页面中:
echo.
echo 1. 点击 "Site configuration" 或 "Site settings"
echo 2. 找到 "Environment variables" 部分
echo 3. 点击 "Add a variable" 添加以下变量:
echo.
echo ┌─────────────────────────────────────────┐
echo │ 变量名: NEXT_PUBLIC_SUPABASE_URL        │
echo │ 变量值: https://gagjnctsiyszzzlviycz.supabase.co │
echo └─────────────────────────────────────────┘
echo.
echo ┌─────────────────────────────────────────┐
echo │ 变量名: NEXT_PUBLIC_SUPABASE_ANON_KEY    │
echo │ 变量值: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... │
echo └─────────────────────────────────────────┘
echo.
echo ┌─────────────────────────────────────────┐
echo │ 变量名: SUPABASE_SERVICE_ROLE_KEY      │
echo │ 变量值: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... │
echo └─────────────────────────────────────────┘
echo.
echo ┌─────────────────────────────────────────┐
echo │ 变量名: ADMIN_USERNAME                  │
echo │ 变量值: admin                           │
echo └─────────────────────────────────────────┘
echo.
echo ┌─────────────────────────────────────────┐
echo │ 变量名: ADMIN_PASSWORD                  │
echo │ 变量值: admin123                         │
echo └─────────────────────────────────────────┘
echo.
echo ┌─────────────────────────────────────────┐
echo │ 变量名: SEMESTER_START_DATE             │
echo │ 变量值: 2025-02-24                      │
echo └─────────────────────────────────────────┘
echo.
echo ┌─────────────────────────────────────────┐
echo │ 变量名: WEEKLY_DEADLINE                 │
echo │ 变量值: Sunday 23:59                   │
echo └─────────────────────────────────────────┘
echo.
echo 【第 2 步】连接代码
echo ========================================
echo.
echo 1. 在 Netlify 页面中找到 "Deploys" 或 "Deploy"
echo 2. 点击 "Link to a repository" 或 "New deployment"
echo 3. 选择 GitHub 并授权
echo 4. 选择 weekly-report-system 仓库
echo 5. 确认构建配置:
echo    - Build command: npm run build
echo    - Publish directory: .next
echo.
echo 【第 3 步】部署
echo ========================================
echo.
echo 1. 点击 "Deploy site" 或 "Trigger deploy"
echo 2. 等待部署完成（约 2-3 分钟）
echo 3. 完成后会显示公网地址
echo.
echo ========================================
echo.
echo 需要创建 GitHub 仓库吗?
echo.
echo 按 Y 创建 GitHub 仓库并推送代码
echo 按任意键跳过
echo.

choice /c YN /n /m "请选择: "
if errorlevel 2 goto :skip_github

cls
echo ========================================
echo    创建 GitHub 仓库
echo ========================================
echo.
echo 请按以下步骤操作:
echo.
echo 1. 访问 https://github.com/new
echo 2. 仓库名: weekly-report-system
echo 3. 点击 "Create repository"
echo 4. 复制下面显示的命令:
echo.
echo git remote add origin https://github.com/你的用户名/weekly-report-system.git
echo git push -u origin main
echo.
echo ========================================
echo.
echo 正在打开 GitHub...
echo.

start "" "https://github.com/new"

:skip_github
echo.
echo ========================================
echo    部署完成后
echo ========================================
echo.
echo 您的公网地址将是:
echo   https://weekly-report-system.netlify.app
echo.
echo 访问地址测试登录:
echo   管理员: admin / admin123
echo   学生: 张唯一 / 230030210
echo.
echo ========================================
echo.
pause
