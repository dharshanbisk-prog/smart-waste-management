@echo off
title IoT Smart Waste Monitoring & Route Optimization
cd /d "%~dp0"

echo ===================================================================
echo   IoT-Enabled Smart Waste Monitoring & Route Optimization System
echo   Environmental Studies (EVS) Prototype
echo ===================================================================
echo.
echo [1/2] Launching your web browser at http://localhost:3000 ...
start "" "http://localhost:3000"

echo [2/2] Starting IoT simulation server...
echo.
echo Press Ctrl+C or close this window when you are done.
echo ===================================================================
echo.

node server.js

:: Fallback if node exits or fails
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Opening in Standalone Browser Mode...
    start "" "public\index.html"
)
pause
