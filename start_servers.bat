@echo off
chcp 65001 >nul
title FARM AI — Launch

:: ── Detect local IP ──────────────────────────────────────────────────────────
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /C:"IPv4"') do (
    for /f "tokens=1" %%b in ("%%a") do (
        set LOCAL_IP=%%b
        goto :ip_found
    )
)
:ip_found

echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║            FARM AI — Smart Agriculture               ║
echo  ╠══════════════════════════════════════════════════════╣
echo  ║                                                      ║
echo  ║  [1] Backend API     http://localhost:8000/docs      ║
echo  ║                                                      ║
echo  ║  [2] Owner Dashboard http://localhost:5173           ║
echo  ║      (desktop, hot reload, dev mode)                 ║
echo  ║                                                      ║
echo  ║  [3] Worker PWA      http://%LOCAL_IP%:4173/worker-login
echo  ║      (mobile, production build, full PWA)            ║
echo  ║                                                      ║
echo  ╚══════════════════════════════════════════════════════╝
echo.
echo  Give workers this URL: http://%LOCAL_IP%:4173/worker-login
echo  (or scan the QR code printed in the Mobile PWA window)
echo.
echo  NOTE: Mobile PWA window will build first (~30s), then start.
echo        Owner dashboard is available immediately.
echo.
pause

:: ── 1. Backend ────────────────────────────────────────────────────────────────
start "FARM AI — Backend (8000)" cmd /k "cd /d "%~dp0backend" && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

:: ── 2. Owner Dev Server ───────────────────────────────────────────────────────
start "FARM AI — Owner Dashboard (5173)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

:: ── 3. Worker PWA — build then preview ───────────────────────────────────────
start "FARM AI — Worker PWA (4173)" cmd /k "cd /d "%~dp0frontend" && npm run build && npm run mobile"

echo  All three servers starting...
echo  Close this window when done — closing the other windows stops each server.
