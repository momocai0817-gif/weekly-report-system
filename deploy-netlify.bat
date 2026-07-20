@echo off
chcp 65001 >nul
echo ========================================
echo    部署到 Netlify (免费)
echo ========================================
echo.
echo Netlify 是一个免费的部署平台
echo 不需要复杂的登录流程
echo.

cd /d "%~dp0"

echo 步骤 1: 安装 Netlify CLI
echo ========================
call npm install -g netlify-cli 2>nul
if errorlevel 1 (
    echo 安装中，请稍候...
    call npm install -g netlify-cli
)
echo.
echo ✓ Netlify CLI 已安装
echo.

echo 步骤 2: 登录 Netlify
echo ========================
echo.
echo 会打开浏览器，请登录或注册 Netlify 账号（免费）
echo.
pause

call netlify login

echo.
echo 步骤 3: 初始化项目
echo ========================
echo.
echo 按提示操作：
echo - ? What command to build? → npm run build
echo - ? Command to publish? → .next
echo - ? Directory with serverless functions? → .next
echo - ? Netlify site name? → weekly-report-system
echo.
pause

call netlify init

echo.
echo 步骤 4: 部署
echo ========================
echo.

call netlify deploy --prod

echo.
echo ========================================
echo    部署完成！
echo ========================================
echo.
pause
