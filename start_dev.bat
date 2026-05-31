@echo off
echo ============================================
echo   Smart Farm AI - Dev Stack Launcher
echo ============================================
echo.

REM Check Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker Desktop is not running!
    echo Please start Docker Desktop and wait for the whale icon to turn green.
    echo Then run this script again.
    pause
    exit /b 1
)

echo [OK] Docker Desktop is running
echo.
echo Starting full dev stack...
echo.

docker compose -f docker-compose.dev.yml --env-file .env.dev up -d --build

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to start containers. Check logs:
    echo   docker compose -f docker-compose.dev.yml logs
    pause
    exit /b 1
)

echo.
echo ============================================
echo   All services started!
echo ============================================
echo.
echo   Frontend  : http://localhost
echo   Backend   : http://localhost:8000/docs
echo   Prometheus: http://localhost:9090
echo   Grafana   : http://localhost:3000  (admin/admin)
echo.

timeout /t 3 /nobreak >nul
start http://localhost
start http://localhost:3000

echo Press any key to view logs (Ctrl+C to exit logs)...
pause >nul
docker compose -f docker-compose.dev.yml logs -f
