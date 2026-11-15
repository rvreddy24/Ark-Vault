#!/usr/bin/env bash
# Ark Vault - Family Operating System
# macOS / Linux 1-Click Launcher

cd "$(dirname "$0")" || exit 1

echo "========================================================"
echo "  🛡️  Ark Vault - Family Emergency & Continuity OS"
echo "  100% Private Offline Vault - Zero Cloud Dependency"
echo "========================================================"
echo ""
echo "Launching Ark Vault in your default web browser..."

if [ -f "public/index.html" ]; then
    open "public/index.html" 2>/dev/null || xdg-open "public/index.html" 2>/dev/null
elif [ -f "index.html" ]; then
    open "index.html" 2>/dev/null || xdg-open "index.html" 2>/dev/null
else
    python3 server.py
fi

echo "Ark Vault opened!"
sleep 2
exit 0
