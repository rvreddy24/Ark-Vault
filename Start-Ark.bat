@echo off
setlocal
cd /d "%~dp0"
title Ark - Local household handover
where py >nul 2>nul
if %errorlevel% equ 0 (
    py -3 server.py --open
    if errorlevel 1 pause
    exit /b
)
where python >nul 2>nul
if %errorlevel% equ 0 (
    python server.py --open
    if errorlevel 1 pause
    exit /b
)
echo Python was not found. Opening the standalone file instead.
echo File-based browser storage varies. Keep backups and use the same browser and location.
start "" "%~dp0public\index.html"
pause
