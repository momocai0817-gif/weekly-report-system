@echo off
chcp 65001 >nul
echo ========================================
echo    启动周报系统（公网访问）
echo ========================================
echo.
echo 此脚本会：
echo 1. 启动本地服务器
echo 2. 使用 ngrok 创建公网访问地址
echo.

cd /d "%~dp0"

echo 检查 ngrok...
where ngrok >nul 2>&1
if errorlevel 1 (
    echo.
    echo ========================================
    echo   请先安装 ngrok
    echo ========================================
    echo.
    echo 下载地址: https://ngrok.com/download
    echo.
    echo 下载后:
    echo 1. 解压到任意目录
    echo 2. 将 ngrok.exe 所在路径添加到系统 PATH
    echo 3. 重新运行此脚本
    echo.
    pause
    exit /b
)

echo ✓ ngrok 已安装
echo.

echo 步骤 1: 启动开发服务器...
echo.

start "Next.js Dev Server" cmd /k "npm run dev"

echo 等待服务器启动...
timeout /t 5 >nul

echo.
echo 步骤 2: 创建公网访问地址...
echo.

start "Ngrok Tunnel" cmd /k "ngrok http 3000"

echo.
echo ========================================
echo    服务已启动！
echo ========================================
echo.
echo ngrok 窗口会显示公网访问地址
echo 格式类似: https://xxx.ngrok-free.app
echo.
echo 访问步骤:
echo 1. 查看 ngrok 窗口
echo 2. 复制 Forwarding 中的 https 地址
echo 3. 在任何设备浏览器中打开
echo.
echo 注意: ngrok 窗口关闭后服务会停止
echo.
pause
