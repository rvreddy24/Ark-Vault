#!/usr/bin/env bash
cd "$(dirname "$0")" || exit 1
if command -v python3 >/dev/null 2>&1; then
  python3 server.py --open
else
  echo "Python 3 was not found. Opening the standalone file."
  echo "File-based storage varies. Keep backups and use the same browser and location."
  open "public/index.html" 2>/dev/null || xdg-open "public/index.html"
fi
