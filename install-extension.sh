#!/bin/bash
# NativeCopy VS Code Extension Installer (Mac & Linux)

DEST="$HOME/.vscode/extensions/nativecopy-1.0.0"

echo "========================================================"
echo " ⚡ Memasang Ekstensi VS Code NativeCopy..."
echo "========================================================"

mkdir -p "$DEST"
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cp -r "$DIR/vscode-extension/"* "$DEST/"

echo "✅ Berhasil dipasang ke: $DEST"
echo "👉 Sekarang buka / restart VS Code Anda."
echo "👉 Tekan Ctrl+Shift+P (atau Cmd+Shift+P di Mac), ketik:"
echo "   'NativeCopy: Connect Account / Set Token'"
echo "   dan masukkan Token Akun Anda."
echo "========================================================"
