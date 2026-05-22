#Requires -Version 5.1
# Smart Farm AI — Dev Launcher
# Usage:  .\start_all.ps1
# Starts: Backend (8000) · Owner Dashboard (5173) · Worker PWA (4173) · IoT Telemetry

# ── Paths ────────────────────────────────────────────────────────────────────
$Root     = $PSScriptRoot
$Backend  = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"
$Iot      = Join-Path $Root "iot"

# venv is at project ROOT (not inside backend/)
$VEnvPy   = Join-Path $Root ".venv\Scripts\python.exe"
$Python   = if (Test-Path $VEnvPy) { $VEnvPy } else { "python" }

# ── Local IP (for PWA QR code) ───────────────────────────────────────────────
try {
    $iface   = (Get-NetRoute -DestinationPrefix '0.0.0.0/0' |
                Sort-Object RouteMetric | Select-Object -First 1).InterfaceIndex
    $LocalIP = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceIndex $iface `
                -ErrorAction Stop).IPAddress
} catch { $LocalIP = $null }
if (-not $LocalIP) {
    $LocalIP = (Get-NetIPAddress -AddressFamily IPv4 |
        Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.*' } |
        Select-Object -First 1).IPAddress
}
if (-not $LocalIP) { $LocalIP = "localhost" }

# ── Banner ───────────────────────────────────────────────────────────────────
Clear-Host
Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "  ║         Smart Farm AI v3.0  —  Lanceur complet           ║" -ForegroundColor Green
Write-Host "  ╚══════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "  Python  : $Python" -ForegroundColor DarkGray
Write-Host "  LocalIP : $LocalIP" -ForegroundColor DarkGray
Write-Host ""

# ── Pre-flight checks ────────────────────────────────────────────────────────
$Fail = @()
if (-not (Test-Path $Backend))  { $Fail += "Dossier backend introuvable  : $Backend" }
if (-not (Test-Path $Frontend)) { $Fail += "Dossier frontend introuvable : $Frontend" }
try   { $null = & npm --version 2>$null } catch { $Fail += "npm introuvable — installez Node.js d'abord." }
try   { $null = & $Python --version 2>$null } catch { $Fail += "Python introuvable à : $Python" }

if ($Fail.Count -gt 0) {
    Write-Host "  ERREURS PRE-LANCEMENT :" -ForegroundColor Red
    $Fail | ForEach-Object { Write-Host "    [!] $_" -ForegroundColor Red }
    Write-Host ""
    Read-Host "Appuyez sur Entrée pour quitter"
    exit 1
}

# ── Helper: open a new PowerShell window ─────────────────────────────────────
function Start-Window {
    param([string]$Title, [string]$WorkDir, [string]$Cmd)
    $script = "Set-Location '$WorkDir'; `$Host.UI.RawUI.WindowTitle = '$Title'; $Cmd; Read-Host '(fin — Entrée pour fermer)'"
    Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $script
}

# ── [1/4] Backend FastAPI ─────────────────────────────────────────────────────
Write-Host "  [1/4] Backend FastAPI :8000 ..." -ForegroundColor Cyan
# Kill any existing process on port 8000
$existing = netstat -ano | Select-String ":8000 " | Select-String "LISTENING"
if ($existing) {
    $pid8000 = ($existing -split '\s+')[-1]
    Write-Host "        Port 8000 occupé (PID $pid8000) — libération..." -ForegroundColor Yellow
    Stop-Process -Id $pid8000 -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 800
}

Start-Window `
    -Title "SmartFarm | Backend :8000" `
    -WorkDir $Backend `
    -Cmd "& '$Python' -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

# ── Wait for backend /health (poll every 2 s, max 30 s) ──────────────────────
Write-Host "        Attente du backend..." -NoNewline -ForegroundColor DarkGray
$ok = $false
for ($i = 0; $i -lt 15; $i++) {
    Start-Sleep -Seconds 2
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:8000/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        if ($r.StatusCode -eq 200) { $ok = $true; break }
    } catch { }
    Write-Host "." -NoNewline -ForegroundColor DarkGray
}
if ($ok) {
    Write-Host " OK ✓" -ForegroundColor Green
} else {
    Write-Host " TIMEOUT" -ForegroundColor Yellow
    Write-Host "        Backend pas encore prêt — vérifiez la fenêtre Backend." -ForegroundColor Yellow
}
Write-Host ""

# ── [2/4] Owner Dashboard (Vite dev) ─────────────────────────────────────────
Write-Host "  [2/4] Owner Dashboard (Vite) :5173 ..." -ForegroundColor Cyan
Start-Window `
    -Title "SmartFarm | Dashboard :5173" `
    -WorkDir $Frontend `
    -Cmd "npm run dev"
Start-Sleep -Milliseconds 500

# ── [3/4] Worker PWA (build → preview HTTPS) ─────────────────────────────────
Write-Host "  [3/4] Worker PWA :4173 (build en cours ~30 s) ..." -ForegroundColor Magenta
Start-Window `
    -Title "SmartFarm | Worker PWA :4173" `
    -WorkDir $Frontend `
    -Cmd "npm run build; if (`$LASTEXITCODE -eq 0) { npm run mobile } else { Write-Host 'BUILD ECHOUE' -ForegroundColor Red }"
Start-Sleep -Milliseconds 400

# ── [4/4] IoT Telemetry Collector ────────────────────────────────────────────
if (Test-Path (Join-Path $Iot "log_telemetry.py")) {
    Write-Host "  [4/4] IoT Telemetry Collector (TCP 4000+4001) ..." -ForegroundColor Yellow
    Start-Window `
        -Title "SmartFarm | IoT Telemetry" `
        -WorkDir $Iot `
        -Cmd "Write-Host 'IoT Collector démarré — en attente Wokwi...' -ForegroundColor Cyan; & '$Python' -u log_telemetry.py"
} else {
    Write-Host "  [4/4] IoT log_telemetry.py absent — skipped." -ForegroundColor DarkGray
}

# ── Firewall (silencieux si pas admin) ───────────────────────────────────────
foreach ($port in @(8000, 5173, 4173)) {
    if (-not (Get-NetFirewallRule -DisplayName "SmartFarm $port" -ErrorAction SilentlyContinue)) {
        try {
            New-NetFirewallRule -DisplayName "SmartFarm $port" -Direction Inbound `
                -Protocol TCP -LocalPort $port -Action Allow -ErrorAction Stop | Out-Null
        } catch { }  # silencieux si pas admin
    }
}

# ── Résumé final ─────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "  ║  Tous les services sont lancés                            ║" -ForegroundColor Green
Write-Host "  ╠══════════════════════════════════════════════════════════╣" -ForegroundColor Green
Write-Host "  ║  Backend   →  http://localhost:8000                       ║" -ForegroundColor White
Write-Host "  ║  API Docs  →  http://localhost:8000/docs                  ║" -ForegroundColor White
Write-Host "  ║  Dashboard →  http://localhost:5173                       ║" -ForegroundColor White
Write-Host "  ║  PWA Worker→  https://${LocalIP}:4173/worker-login         ║" -ForegroundColor Magenta
Write-Host "  ╠══════════════════════════════════════════════════════════╣" -ForegroundColor Green
Write-Host "  ║  Login Owner  :  med  /  admin123                         ║" -ForegroundColor Yellow
Write-Host "  ║  Login Worker :  flux OTP WhatsApp                        ║" -ForegroundColor Yellow
Write-Host "  ╚══════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "  Pour arrêter : fermez les 4 fenêtres de terminal." -ForegroundColor DarkGray
Write-Host ""
Read-Host "  Appuyez sur Entrée pour fermer ce lanceur"
