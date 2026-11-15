@echo off
TITLE Ark Vault - Family Operating System
echo ========================================================
echo   🛡️  Ark Vault - Family Emergency & Continuity OS
echo   100%% Private Offline Vault - Zero Cloud Dependency
echo ========================================================
echo.
echo Launching Ark Vault in your default web browser...
echo.

:: Try opening index.html directly with default browser
if exist "public\index.html" (
    start "" "public\index.html"
) else if exist "index.html" (
    start "" "index.html"
) else (
    echo [!] Could not locate index.html. Starting server fallback...
    python server.py
)

echo Ark Vault opened!
timeout /t 3 >nul
exit
