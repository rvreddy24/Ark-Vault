#!/usr/bin/env bash
cd "$(dirname "$0")" || exit 1
if [ ! -f "public/index.html" ] || [ ! -f "server.py" ]; then
  echo "Ark files are missing. Extract the complete ZIP before launching."
  read -r -p "Press Return to close. "
  exit 1
fi
if command -v python3 >/dev/null 2>&1 && python3 -c 'import sys; sys.exit(sys.version_info < (3, 9))' >/dev/null 2>&1; then
  python3 server.py --open
  result=$?
  if [ "$result" -ne 0 ]; then
    echo "Ark could not start. Read the message above before switching launch methods."
    read -r -p "Press Return to close. "
  fi
  exit "$result"
fi
echo "Python 3.9 or later was not found. Opening the portable app instead."
echo "Keep this folder in the same place and use the same browser/profile."
echo "Browser storage is not a backup. Download and test an encrypted backup."
if command -v open >/dev/null 2>&1; then
  open "public/index.html" && exit 0
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "public/index.html" && exit 0
fi
echo "Open the public folder and double-click index.html in a current browser."
read -r -p "Press Return to close. "
exit 1
