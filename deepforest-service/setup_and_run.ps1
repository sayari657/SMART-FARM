# DeepForest microservice — one-shot setup + run (isolated venv).
# Uses Python 3.10/3.11/3.12 (prebuilt wheels — avoids compiling numpy/torch).
# Usage:  powershell -ExecutionPolicy Bypass -File deepforest-service\setup_and_run.ps1
$ErrorActionPreference = "Stop"
$Dir = $PSScriptRoot
Set-Location $Dir

# 1. Pick a wheel-friendly interpreter (NOT 3.13 — many ML wheels lag there)
$pyExe = $null
foreach ($v in '3.12', '3.11', '3.10') {
    try { & py "-$v" -c "print(1)" *> $null; if ($LASTEXITCODE -eq 0) { $pyExe = "py -$v"; break } } catch {}
}
if (-not $pyExe) { Write-Host "  [!] Python 3.10-3.12 introuvable. Installez Python 3.11 puis relancez." -ForegroundColor Red; exit 1 }
Write-Host "  Interpréteur choisi : $pyExe" -ForegroundColor DarkGray

# 2. (Re)create the venv if missing or built with an incompatible Python (>=3.13)
$recreate = $true
if (Test-Path ".venv") {
    try {
        $ver = & ".venv\Scripts\python.exe" -c "import sys;print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>$null
        if ($ver -and [version]$ver -lt [version]'3.13') { $recreate = $false }
    } catch {}
    if ($recreate) { Write-Host "  Suppression du venv incompatible..." -ForegroundColor Yellow; Remove-Item -Recurse -Force ".venv" }
}
if ($recreate) {
    Write-Host "[1/3] Création du venv isolé..." -ForegroundColor Cyan
    Invoke-Expression "$pyExe -m venv .venv"
}

# 3. Install (skip if already installed → fast restart)
& ".venv\Scripts\python.exe" -c "import deepforest, fastapi, uvicorn" 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "[2/3] Dépendances déjà installées — démarrage rapide." -ForegroundColor Green
} else {
    Write-Host "[2/3] Installation (1er run: torch + modèle ~1-2 Go)..." -ForegroundColor Cyan
    & ".venv\Scripts\python.exe" -m pip install --upgrade pip -q
    & ".venv\Scripts\python.exe" -m pip install --only-binary=:all: "numpy<2.0"
    & ".venv\Scripts\python.exe" -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
    & ".venv\Scripts\python.exe" -m pip install -r requirements.txt
}

Write-Host "[3/3] Démarrage sur http://localhost:8800 ..." -ForegroundColor Green
Write-Host "      Mettez DEEPFOREST_URL=http://localhost:8800 dans backend\.env puis redémarrez le backend." -ForegroundColor Yellow
& ".venv\Scripts\python.exe" -m uvicorn app:app --host 0.0.0.0 --port 8800
