@echo off
title Smart Farm AI — Dev Launcher
color 0A
echo.
echo  ╔══════════════════════════════════════════════╗
echo  ║        Smart Farm AI v3.0  —  Dev Start      ║
echo  ╚══════════════════════════════════════════════╝
echo.

:: ── Kill any stale process on port 8000 ──────────────────────────────────────
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8000 " ^| findstr "LISTENING" 2^>nul') do (
    echo [INFO] Port 8000 already in use by PID %%p — killing it...
    taskkill /PID %%p /F >nul 2>&1
)

:: ── Backend ──────────────────────────────────────────────────────────────────
echo [1/2] Starting FastAPI backend on http://127.0.0.1:8000 ...
start "SmartFarm-Backend" cmd /k ^
  "cd /d "%~dp0backend" && ^
   (if exist .venv\Scripts\activate.bat (call .venv\Scripts\activate.bat) else if exist ..\.venv\Scripts\activate.bat (call ..\.venv\Scripts\activate.bat)) && ^
   python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

:: ── Wait for backend /health (poll every 2 s, 30 s timeout) ──────────────────
echo     Waiting for backend to be ready...
set /a attempts=0
:wait_loop
timeout /t 2 /nobreak >nul
curl -sf http://127.0.0.1:8000/health >nul 2>&1
if %errorlevel%==0 goto backend_ready
set /a attempts+=1
if %attempts% geq 15 (
    echo.
    echo  [WARN] Backend did not respond after 30 s.
    echo  Check the "SmartFarm-Backend" window for errors.
    echo  Common fixes:
    echo    - pip install -r requirements.txt
    echo    - Check that Python 3.11 is on PATH
    echo.
    goto start_frontend
)
goto wait_loop

:backend_ready
echo     Backend READY ✓  (http://127.0.0.1:8000)

:start_frontend
:: ── Frontend ─────────────────────────────────────────────────────────────────
echo.
echo [2/2] Starting Vite frontend on http://localhost:5173 ...
start "SmartFarm-Frontend" cmd /k ^
  "cd /d "%~dp0frontend" && npm run dev"

:: ── Summary ──────────────────────────────────────────────────────────────────
echo.
echo  ┌──────────────────────────────────────────────┐
echo  │  Backend   →  http://127.0.0.1:8000          │
echo  │  Frontend  →  http://localhost:5173           │
echo  │  API Docs  →  http://127.0.0.1:8000/docs     │
echo  ├──────────────────────────────────────────────┤
echo  │  Owner login : med  /  admin123              │
echo  │  Worker      : WhatsApp OTP flow             │
echo  └──────────────────────────────────────────────┘
echo.
pause
