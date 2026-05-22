@echo off
title Smart Farm AI — Dev Launcher
color 0A
echo.
echo  ╔══════════════════════════════════════════════╗
echo  ║        Smart Farm AI v3.0  —  Dev Start      ║
echo  ╚══════════════════════════════════════════════╝
echo.

:: ── Backend ─────────────────────────────────────────────────────
echo [1/2] Starting FastAPI backend on http://127.0.0.1:8000 ...
start "SmartFarm Backend" cmd /k "cd /d "%~dp0backend" && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

:: Wait for backend to be ready (poll /health up to 30 s)
echo     Waiting for backend...
set /a attempts=0
:wait_loop
timeout /t 2 /nobreak >nul
curl -s http://127.0.0.1:8000/health >nul 2>&1
if %errorlevel%==0 goto backend_ready
set /a attempts+=1
if %attempts% geq 15 (
    echo     [WARN] Backend did not respond in 30 s — check the backend window.
    goto start_frontend
)
goto wait_loop

:backend_ready
echo     Backend READY ✓

:start_frontend
:: ── Frontend ────────────────────────────────────────────────────
echo.
echo [2/2] Starting Vite frontend on http://localhost:5173 ...
start "SmartFarm Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo  Both services started.
echo  Backend  →  http://127.0.0.1:8000  (FastAPI / Uvicorn)
echo  Frontend →  http://localhost:5173   (Vite / React)
echo  API Docs →  http://127.0.0.1:8000/docs
echo.
echo  Login credentials:
echo    Owner  : med  /  admin123
echo    Worker : use WhatsApp OTP flow
echo.
pause
