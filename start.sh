#!/bin/bash
# NativeCopy Launcher Script

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "======================================================="
echo " 📋 Memulai NativeCopy - Cross-Device Clipboard LAN"
echo "======================================================="
python3 server.py
