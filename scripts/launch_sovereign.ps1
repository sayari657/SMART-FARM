# Smart Farm Sovereign Launch
Set-Location "$PSScriptRoot\.."
Write-Host '🚀 Starting Sovereign GIS Platform...' -ForegroundColor Cyan

# 1. Start GIS
docker-compose -f docker-compose.gis.yml up -d

# 2. Check & Install Deps
Write-Host '📦 Checking Dependencies...'
python -m pip install chromadb bcrypt python-jose passlib python-multipart

# 3. Start Backend
Write-Host '⚙️ Starting API Server...'
Push-Location backend
Start-Process python "-m uvicorn app.main:app --reload --port 8000"
Pop-Location

Write-Host '✅ Platform is Launching!' -ForegroundColor Green
Write-Host 'Map: http://localhost:5173/map'
Write-Host 'API: http://localhost:8000/docs'
