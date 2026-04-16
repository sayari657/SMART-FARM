# Smart Farm Parallel Launcher (GIS + Backend + Frontend)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ProjectRoot = Split-Path -Parent $ScriptDir

Write-Host '🚀 INITIALIZING ALL SYSTEMS IN PARALLEL...' -ForegroundColor Cyan

# Use Start-Process to launch 3 separate monitor-able windows

# 1. GIS Cluster
Write-Host '📦 Starting GIS Layer...'
Start-Process powershell -ArgumentList '-NoExit', '-Command', "cd '$ProjectRoot'; docker-compose -f docker-compose.gis.yml down; docker-compose -f docker-compose.gis.yml up"

# 2. Frontend Engine
Write-Host '🎨 Starting Frontend Node...'
Start-Process powershell -ArgumentList '-NoExit', '-Command', "cd '$ProjectRoot\frontend'; npm run dev"

# 3. Backend API
Write-Host '⚙️ Starting Backend Hub...'
Start-Process powershell -ArgumentList '-NoExit', '-Command', "cd '$ProjectRoot\backend'; python -m pip install chromadb bcrypt python-jose passlib python-multipart; python -m uvicorn app.main:app --reload --port 8000"

Write-Host '✅ ALL SYSTEMS BROADCASTING' -ForegroundColor Green
Write-Host '------------------------------------------------'
Write-Host '🌎 App: http://localhost:5173'
Write-Host '🛡️ API: http://localhost:8000'
Write-Host '🗺️ GIS: http://localhost:9090'
Write-Host '------------------------------------------------'
Write-Host 'Observe the 3 open windows for real-time logs.'
