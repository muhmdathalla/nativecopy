@echo off
REM NativeCopy VS Code Extension Installer (Windows)

set DEST=%USERPROFILE%\.vscode\extensions\muhmdathalla.nativecopy-1.0.0

echo ========================================================
echo  ⚡ Memasang Ekstensi VS Code NativeCopy...
echo ========================================================

if not exist "%DEST%" mkdir "%DEST%"
xcopy /E /I /Y "%~dp0vscode-extension\*" "%DEST%\"

echo.
echo ✅ Berhasil dipasang ke: %DEST%
echo 👉 Sekarang reload VS Code (Ctrl+Shift+P -^> Developer: Reload Window).
echo 👉 Tekan Ctrl+Shift+P, ketik: NativeCopy: Connect
echo ========================================================
pause
