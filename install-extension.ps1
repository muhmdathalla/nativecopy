# NativeCopy VS Code Extension Installer (PowerShell for Windows)

$dest = "$HOME\.vscode\extensions\muhmdathalla.nativecopy-1.0.0"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " ⚡ Memasang Ekstensi VS Code NativeCopy..." -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan

if (-not (Test-Path $dest)) {
    New-Item -ItemType Directory -Path $dest -Force | Out-Null
}

$source = Join-Path $PSScriptRoot "vscode-extension\*"
Copy-Item -Path $source -Destination $dest -Recurse -Force

Write-Host ""
Write-Host "✅ Berhasil dipasang ke: $dest" -ForegroundColor Green
Write-Host "👉 Sekarang reload VS Code (Ctrl+Shift+P -> Developer: Reload Window)." -ForegroundColor White
Write-Host "👉 Tekan Ctrl+Shift+P, ketik: NativeCopy: Connect" -ForegroundColor White
Write-Host "========================================================" -ForegroundColor Cyan
