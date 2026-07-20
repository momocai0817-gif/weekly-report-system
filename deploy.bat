@echo off
chcp 65001 >nul
echo ========================================
echo    部署到 Vercel
echo ========================================
echo.
echo 使用稳定版本的 Vercel CLI...
echo.

cd /d "%~dp0"

echo 步骤 1: 登录 Vercel
echo ========================
echo.
echo 1. 浏览器会自动打开
echo 2. 选择 GitHub、GitLab 或 Bitbucket 登录
echo 3. 授权 Vercel 访问
echo 4. 登录成功后返回这里继续
echo.
pause

echo.
echo 正在启动登录...
call npx vercel@32 login

echo.
echo.
echo 步骤 2: 部署项目
echo ========================
echo.
pause

call npx vercel@32

echo.
echo ========================================
echo    部署完成！
echo ========================================
echo.
echo 上述输出的 Production URL 即为公网访问地址
echo.
pause
