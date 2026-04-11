# --- Smart Farm AI v3.0-Enterprise (Sovereign Launch) ---
# Precision-engineered by Antigravity for Sovereign Agriculture

$env:PYTHONPATH = (Resolve-Path "backend").Path
$pythonCmd = "python"
if (Test-Path ".venv\Scripts\python.exe") {
    $pythonCmd = (Resolve-Path ".venv\Scripts\python.exe").Path
}

Write-Host "🌿 Initiating Sovereign Smart Farm Ecosystem..." -ForegroundColor Green

# 1. Start Infrastructure
Write-Host "🏗️ Checking Docker Infrastructure..." -ForegroundColor Cyan
try {
    docker ps > $null
} catch {
    Write-Host "🐳 Docker is not running. Attempting to start Docker Desktop..." -ForegroundColor Yellow
    if (Test-Path "C:\Program Files\Docker\Docker\Docker Desktop.exe") {
        Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
        Write-Host "⏳ Waiting for Docker engine to initialize (this may take 1-2 minutes)..." -ForegroundColor Yellow
        while (!(docker ps 2>$null)) {
            Start-Sleep -Seconds 5
            Write-Host "." -NoNewline -ForegroundColor Yellow
        }
        Write-Host "`n✅ Docker is now online!" -ForegroundColor Green
    } else {
        Write-Host "❌ Error: Docker Desktop not found at standard path. Please start it manually." -ForegroundColor Red
        exit
    }
}

Write-Host "🚀 Starting Docker Containers (Postgres, ChromaDB, Mosquitto, Redis, Ollama)..." -ForegroundColor Cyan
docker-compose up -d

# 1.5 Wait for ChromaDB to be ready
Write-Host "⏳ Waiting for ChromaDB to wake up (port 8001)..." -ForegroundColor Yellow
while (!(Test-NetConnection -ComputerName localhost -Port 8001 -WarningAction SilentlyContinue).TcpTestSucceeded) {
    Start-Sleep -Seconds 2
}
Write-Host "✅ ChromaDB is Ready!" -ForegroundColor Green

# 2. Pull AI Models (Sovereign Intelligence)
Write-Host "🧠 Pulling Sovereign Intelligence Models (Llava & Labess)..." -ForegroundColor Cyan
Write-Host "Note: This may take time on the first run." -ForegroundColor Yellow
docker exec smart_farm_ollama ollama pull llava
docker exec smart_farm_ollama ollama pull labess

# 3. Seed Knowledge & Data
Write-Host "🌱 Ingesting Tunisian Agricultural Wisdom (RAG)..." -ForegroundColor Cyan
& $pythonCmd backend/app/utils/seed_rag_data.py

Write-Host "🚜 Seeding Farm Data..." -ForegroundColor Cyan
& $pythonCmd seed_farm_data.py

# 4. Launch Services
Write-Host "🚀 Launching Application Layer..." -ForegroundColor Green

# Backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:PYTHONPATH = '$(Resolve-Path "backend").Path'; cd backend; & '$pythonCmd' -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload" -WindowStyle Normal

# Frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev" -WindowStyle Normal

# Sovereign Workers
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:PYTHONPATH = '$(Resolve-Path "backend").Path'; cd workers; & '$pythonCmd' ingestion/simulator.py" -WindowStyle Normal
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:PYTHONPATH = '$(Resolve-Path "backend").Path'; cd workers; & '$pythonCmd' cv_inference.py" -WindowStyle Normal

Write-Host "✅ System Online!" -ForegroundColor Green
Write-Host "Dashboard: http://localhost:5173" -ForegroundColor White
Write-Host "API Assistant: http://localhost:5173/assistant" -ForegroundColor White
