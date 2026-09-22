@echo off
REM NativeCopy VS Code Extension Installer (Windows)

set "DEST=%USERPROFILE%\.vscode\extensions\nativecopy-1.0.0"

echo ========================================================
echo  ⚡ Memasang Ekstensi VS Code NativeCopy...
echo ========================================================

if not exist "%DEST%" mkdir "%DEST%"
xcopy /s /y /q "%~dp0vscode-extension\*" "%DEST%\"

echo.
echo ✅ Ekstensi berhasil dipasang ke %DEST%
echo 👉 Buka atau restart VS Code Anda.
echo 👉 Tekan Ctrl+Shift+P di VS Code, ketik:
echo    "NativeCopy: Connect Account / Set Token"
echo    dan masukkan Token Akun Anda.
echo ========================================================
pause
