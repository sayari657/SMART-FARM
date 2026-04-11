# --- Smart Farm AI v3.0-Enterprise (Lite Mode Launch) ---
# Running without Docker. Using local SQLite and AI Mocking.

Write-Host "🌿 Initiating Smart Farm Ecosystem (Lite Mode - No Docker)..." -ForegroundColor Yellow

$env:PYTHONPATH = (Resolve-Path "backend").Path
$env:LITE_MODE = "true" # Force Lite mode for AI services
$env:DATABASE_URL = "sqlite:///./smart_farm.db"

$pythonCmd = "python"
if (Test-Path ".venv\Scripts\python.exe") {
    $pythonCmd = (Resolve-Path ".venv\Scripts\python.exe").Path
}

# 1. Initialize Local Database
Write-Host "🌱 Initializing Local SQLite Database..." -ForegroundColor Cyan
& $pythonCmd backend/app/utils/init_local_db.py
& $pythonCmd seed_farm_data.py

# 2. Launch Services (Local Processes)
Write-Host "🚀 Launching Application Layer..." -ForegroundColor Green

# Backend (Uvicorn)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:PYTHONPATH = '$(Resolve-Path "backend").Path'; `$env:LITE_MODE = 'true'; `$env:DATABASE_URL = 'sqlite:///./smart_farm.db'; cd backend; & '$pythonCmd' -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload" -WindowStyle Normal

# Frontend (Vite)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev" -WindowStyle Normal

# Simulated Workers (Telemetry & Mock CV)
Write-Host "🛰️ Starting Performance Simulators..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:PYTHONPATH = '$(Resolve-Path "backend").Path'; cd workers; & '$pythonCmd' ingestion/simulator.py" -WindowStyle Normal
# Note: In Lite mode, we avoid camera CV_Inference to save resources
# Start-Process powershell -ArgumentList "-NoExit", "-Command", "..." 

Write-Host "✅ Lite Mode is Online!" -ForegroundColor Green
Write-Host "Dashboard: http://localhost:5173" -ForegroundColor White
Write-Host "API: http://localhost:8000" -ForegroundColor White
Write-Host "Sovereign Assistant: http://localhost:5173/assistant" -ForegroundColor White
Write-Host "NOTE: Agri-Assistant will run in MOCK mode without Docker/Ollama." -ForegroundColor Yellow
