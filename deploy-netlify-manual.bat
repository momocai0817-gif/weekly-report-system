@echo off
chcp 65001 >nul
echo ========================================
echo    Netlify 手动部署指南
echo ========================================
echo.
echo 由于网络问题，请手动完成部署：
echo.

cd /d "%~dp0"

echo 步骤 1: 访问 Netlify 项目
echo ================================
echo.
echo 1. 访问: https://app.netlify.com/projects/weekly-report-system
echo 2. 点击 "Site configuration" 或 "Site settings"
echo.

echo 步骤 2: 配置环境变量
echo ================================
echo.
echo 在 "Environment variables" 部分添加以下变量：
echo.
echo NEXT_PUBLIC_SUPABASE_URL:
echo   https://gagjnctsiyszzzlviycz.supabase.co
echo.
echo NEXT_PUBLIC_SUPABASE_ANON_KEY:
echo   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhZ2puY3RzaXlzenp6bHZpeWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1NzIxMzUsImV4cCI6MjEwMDE0ODEzNX0.HDhnXIX1QEOw43S09kZtSZJIhaS9AyTgiK6UuaioqZE
echo.
echo SUPABASE_SERVICE_ROLE_KEY:
echo   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhZ2puY3RzaXlzenp6bHZpeWN6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDU3MjEzNSwiZXhwIjoyMTAwMTQ4MTM1fQ._Osm7k58IK7Th4SyJg6aTQ6III8ALm_Be5e0RYvjq1w
echo.
echo ADMIN_USERNAME:
echo   admin
echo.
echo ADMIN_PASSWORD:
echo   admin123
echo.
echo SEMESTER_START_DATE:
echo   2025-02-24
echo.
echo WEEKLY_DEADLINE:
echo   Sunday 23:59
echo.
echo 步骤 3: 部署
echo ================================
echo.
echo 1. 在 Netlify 项目页面
echo 2. 连接 GitHub 仓库（如果还没有）
echo 3. 或者直接拖拽上传文件夹
echo 4. 配置构建命令: npm run build
echo 5. 配置发布目录: .next
echo 6. 点击 "Deploy site"
echo.
echo ========================================
echo.
echo 现在将打开 Netlify 项目页面...
echo.

start "" "https://app.netlify.com/projects/weekly-report-system"

pause
