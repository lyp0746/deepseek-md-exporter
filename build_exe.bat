@echo off
chcp 65001 >nul
echo ============================================
echo   深寻全录 - 打包为 EXE
echo ============================================
echo.

echo [1/4] 安装依赖（含 pyinstaller + Pillow）...
uv sync --extra pack
if errorlevel 1 (
    echo 依赖安装失败！
    pause
    exit /b 1
)

echo.
echo [2/4] 生成 icon.ico（从 icon.png 转换）...
uv run python -c "from PIL import Image; img = Image.open('icon.png').convert('RGBA'); img.save('icon.ico', format='ICO', sizes=[(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)]); print('icon.ico 已生成')"
if errorlevel 1 (
    echo icon.ico 生成失败！
    pause
    exit /b 1
)

echo.
echo [3/4] 确保 Playwright 浏览器已安装...
uv run playwright install chromium
if errorlevel 1 (
    echo Playwright 浏览器安装失败！
    pause
    exit /b 1
)

echo.
echo [4/4] 使用 PyInstaller 打包...
uv run pyinstaller deepseek-exporter.spec --noconfirm --clean
if errorlevel 1 (
    echo 打包失败！
    pause
    exit /b 1
)

echo.
echo ============================================
echo   打包完成！
echo   EXE 文件位于：dist\深寻全录.exe
echo   图标已嵌入 EXE（桌面 + 任务栏 + 窗口）
echo ============================================
echo.
echo 注意：运行 EXE 时需要确保 Playwright 浏览器已安装。
echo   首次运行请先执行：playwright install chromium
echo   或将 %%LOCALAPPDATA%%\ms-playwright 目录一并分发。
echo.
pause