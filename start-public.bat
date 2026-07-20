@echo off
chcp 65001 >nul
echo ========================================
echo    启动周报系统（公网访问）
echo ========================================
echo.
echo 此方案使用 ngrok 创建公网访问地址
echo 不需要复杂的部署，立即可用！
echo.

cd /d "%~dp0"

echo 检查 ngrok...
where ngrok >nul 2>&1
if errorlevel 1 (
    echo.
    echo ========================================
    echo   需要先安装 ngrok
    echo ========================================
    echo.
    echo 请下载 ngrok:
    echo 1. 访问 https://ngrok.com/download
    echo 2. 下载 Windows 版本
    echo 3. 解压到任意目录
    echo 4. 将 ngrok.exe 路径添加到系统 PATH
    echo 5. 重新运行此脚本
    echo.
    echo 或者直接将 ngrok.exe 复制到此目录
    echo.
    pause
    exit /b
)

echo ✓ ngrok 已安装
echo.

echo 步骤 1: 启动开发服务器...
echo.

start "Next.js 周报系统" cmd /k "title Next.js周报系统 && npm run dev"

echo 等待服务器启动...
timeout /t 8 >nul

echo.
echo 步骤 2: 创建公网访问地址...
echo.
echo 正在启动 ngrok...
echo.

start "Ngrok 公网隧道" cmd /k "title Ngrok公网地址 && ngrok http 3000"

echo.
echo ========================================
echo    服务已启动！
echo ========================================
echo.
echo 请查看 "Ngrok 公网隧道" 窗口
echo.
echo 在窗口中找到类似这样的地址:
echo   https://xxxx-xx-xx-xx.ngrok-free.app
echo.
echo 复制这个 https 地址，在任何设备浏览器中打开即可访问！
echo.
echo 注意:
echo - 关闭任一窗口服务会停止
echo - ngrok 免费版每次启动地址会变化
echo - 如需固定地址，可升级 ngrok 付费版
echo.
echo ========================================
echo.
pause
