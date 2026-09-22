#!/bin/bash
# NativeCopy VS Code Extension Installer (Mac & Linux)

DEST="$HOME/.vscode/extensions/muhmdathalla.nativecopy-1.0.0"

echo "========================================================"
echo " ⚡ Memasang Ekstensi VS Code NativeCopy..."
echo "========================================================"

mkdir -p "$DEST"
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cp -r "$DIR/vscode-extension/"* "$DEST/"

echo "✅ Berhasil dipasang ke: $DEST"
echo "👉 Sekarang reload VS Code (Cmd+Shift+P -> Developer: Reload Window)."
echo "👉 Tekan Cmd+Shift+P, ketik: NativeCopy: Connect"
echo "========================================================"
