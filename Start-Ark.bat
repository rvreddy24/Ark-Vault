@echo off
setlocal
cd /d "%~dp0"
title Ark - Local household handover
if not exist "%~dp0public\index.html" goto missing
if not exist "%~dp0server.py" goto missing
py -3 -c "import sys; sys.exit(not (sys.version_info >= (3, 9)))" >nul 2>nul
if not errorlevel 1 goto pylauncher
python -c "import sys; sys.exit(not (sys.version_info >= (3, 9)))" >nul 2>nul
if not errorlevel 1 goto pythonlauncher
echo Python 3.9 or later was not found. Opening the portable app instead.
echo No installation is required for portable mode.
echo Keep this folder in the same place and use the same browser/profile.
echo Browser storage is not a backup. Download and test an encrypted backup.
start "" "%~dp0public\index.html"
exit /b 0
:pylauncher
py -3 "%~dp0server.py" --open
if errorlevel 1 goto failed
exit /b 0
:pythonlauncher
python "%~dp0server.py" --open
if errorlevel 1 goto failed
exit /b 0
:missing
echo Ark files are missing. Right-click the downloaded ZIP and choose Extract All.
echo Run this launcher from the fully extracted folder.
pause
exit /b 1
:failed
echo Ark could not start. Read the message above before trying another launch method.
echo Opening a different origin or browser can look like an empty household.
pause
exit /b 1
