@echo off
title WildGuard AI Launcher
echo ===================================================
echo   WildGuard AI - Smart Wildlife Detection Anywhere
echo ===================================================
echo.
echo [1/2] Launching web browser...
start "" "http://localhost:3000"
echo [2/2] Starting local Python web server on port 3000...
echo.
echo Keep this window open while using the application.
echo Press Ctrl+C in this window to stop the server.
echo ===================================================
python -m http.server 3000
pause
