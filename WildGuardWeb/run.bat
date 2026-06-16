@echo off
title WildGuard AI Launcher
echo ===================================================
echo   WildGuard AI - Smart Wildlife Detection Anywhere
echo ===================================================
echo.
echo [1/3] Launching Python FastAPI AI Backend...
start "WildGuard AI Backend" cmd /k "cd /d "%~dp0..\wildlife_detection" && python -m uvicorn api:app --host 0.0.0.0 --port 8000"
echo.
echo [2/3] Launching web browser...
start "" "http://localhost:3000"
echo.
echo [3/3] Starting local static web server on port 3000...
echo.
echo Keep this window open while using the application.
echo Press Ctrl+C in this window to stop the web server.
echo ===================================================
python "%~dp0web_server.py"
pause
