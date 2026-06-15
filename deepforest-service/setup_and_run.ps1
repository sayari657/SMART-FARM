# DeepForest microservice — one-shot setup + run (isolated venv).
# Usage:  powershell -ExecutionPolicy Bypass -File deepforest-service\setup_and_run.ps1
$ErrorActionPreference = "Stop"
$Dir = $PSScriptRoot
Set-Location $Dir

if (-not (Test-Path ".venv")) {
    Write-Host "[1/3] Creating isolated venv (own torch, no conflict with backend)..." -ForegroundColor Cyan
    python -m venv .venv
}
Write-Host "[2/3] Installing deepforest + deps (first run downloads ~1-2 GB torch)..." -ForegroundColor Cyan
& ".venv\Scripts\python.exe" -m pip install --upgrade pip -q
& ".venv\Scripts\python.exe" -m pip install -r requirements.txt

Write-Host "[3/3] Starting DeepForest service on http://localhost:8800 ..." -ForegroundColor Green
Write-Host "      Set DEEPFOREST_URL=http://localhost:8800 in backend\.env, then restart the backend." -ForegroundColor Yellow
& ".venv\Scripts\python.exe" -m uvicorn app:app --host 0.0.0.0 --port 8800
