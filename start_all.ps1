#Requires -Version 5.1
# ============================================================
#  Smart Farm AI v3.0 -- Stable Launcher
#  Usage:
#    .\start_all.ps1              # start everything
#    .\start_all.ps1 -Stop        # stop all services
#    .\start_all.ps1 -Status      # show service status
#    .\start_all.ps1 -Logs        # stream backend logs
#    .\start_all.ps1 -Restart     # stop then start
# ============================================================
param(
    [switch]$Stop,
    [switch]$Status,
    [switch]$Logs,
    [switch]$Restart
)

$ErrorActionPreference = "SilentlyContinue"

# ── Paths ─────────────────────────────────────────────────────────────────────
$Root     = $PSScriptRoot
$Backend  = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"
$PidDir   = Join-Path $Root ".pids"
$LogDir   = Join-Path $Root ".logs"

$VEnvPy = Join-Path $Root ".venv\Scripts\python.exe"
$Python  = if (Test-Path $VEnvPy) { $VEnvPy } else { "python" }

# ── Local IP for LAN access ───────────────────────────────────────────────────
try {
    $iface   = (Get-NetRoute -DestinationPrefix '0.0.0.0/0' | Sort-Object RouteMetric | Select-Object -First 1).InterfaceIndex
    $LocalIP = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceIndex $iface -ErrorAction Stop).IPAddress
} catch {}
if (-not $LocalIP) {
    $LocalIP = (Get-NetIPAddress -AddressFamily IPv4 |
        Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.*' } |
        Select-Object -First 1).IPAddress
}
if (-not $LocalIP) { $LocalIP = "localhost" }

# ── Colors ────────────────────────────────────────────────────────────────────
function OK($m)   { Write-Host "  [OK] $m" -ForegroundColor Green }
function FAIL($m) { Write-Host "  [!!] $m" -ForegroundColor Red }
function STEP($m) { Write-Host "  >>  $m" -ForegroundColor Cyan }
function INFO($m) { Write-Host "       $m" -ForegroundColor DarkGray }

function Banner {
    Clear-Host
    Write-Host ""
    Write-Host "  ============================================================" -ForegroundColor Green
    Write-Host "       Smart Farm AI v3.0  --  Lanceur Stable" -ForegroundColor Green
    Write-Host "  ============================================================" -ForegroundColor Green
    Write-Host "  Python : $Python" -ForegroundColor DarkGray
    Write-Host "  IP LAN : $LocalIP" -ForegroundColor DarkGray
    Write-Host ""
}

# ── Wait for port ─────────────────────────────────────────────────────────────
function Wait-Port($port, $seconds=30, $label="service") {
    Write-Host "       Attente $label" -NoNewline -ForegroundColor DarkGray
    $deadline = (Get-Date).AddSeconds($seconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $tcp = New-Object Net.Sockets.TcpClient
            $tcp.Connect("127.0.0.1", $port)
            $tcp.Close()
            Write-Host " OK" -ForegroundColor Green
            return $true
        } catch {}
        Start-Sleep -Milliseconds 500
        Write-Host "." -NoNewline -ForegroundColor DarkGray
    }
    Write-Host " TIMEOUT" -ForegroundColor Yellow
    return $false
}

# ── Kill process on port ──────────────────────────────────────────────────────
function Free-Port($port) {
    $procs = netstat -ano 2>$null | Select-String ":$port\s" |
             ForEach-Object { ($_.ToString().Trim() -split '\s+')[-1] } | Sort-Object -Unique
    foreach ($p in $procs) {
        if ($p -match '^\d+$') {
            Stop-Process -Id ([int]$p) -Force -ErrorAction SilentlyContinue
        }
    }
}

# ── PID file helpers ──────────────────────────────────────────────────────────
function Save-PID($name, $pid) {
    New-Item -ItemType Directory -Force $PidDir | Out-Null
    $pid | Out-File "$PidDir\$name.pid" -Encoding ascii -Force
}

function Kill-PID($name) {
    $f = "$PidDir\$name.pid"
    if (Test-Path $f) {
        $p = [int](Get-Content $f -ErrorAction SilentlyContinue)
        if ($p) { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue }
        Remove-Item $f -Force -ErrorAction SilentlyContinue
    }
}

# ── Open a visible terminal window ────────────────────────────────────────────
function Start-Window($Title, $WorkDir, $Cmd) {
    $wrapped = "Set-Location '$WorkDir'; `$Host.UI.RawUI.WindowTitle = '$Title'; $Cmd; Read-Host 'Appuyez Entree pour fermer'"
    $proc = Start-Process powershell `
        -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $wrapped `
        -PassThru
    return $proc
}

# ══════════════════════════════════════════════════════════════════════════════
#  -Stop
# ══════════════════════════════════════════════════════════════════════════════
if ($Stop -or $Restart) {
    Banner
    STEP "Arret de tous les services..."
    Kill-PID "backend"
    Kill-PID "frontend"
    Kill-PID "prometheus"
    Free-Port 8000
    Free-Port 5173
    Free-Port 4173
    OK "Tous les services arretes."
    Write-Host ""
    if (-not $Restart) { exit 0 }
    Start-Sleep -Seconds 1
}

# ══════════════════════════════════════════════════════════════════════════════
#  -Status
# ══════════════════════════════════════════════════════════════════════════════
if ($Status) {
    Banner
    Write-Host "  Service          Port    Etat" -ForegroundColor Cyan
    Write-Host "  ---------------  ------  -----" -ForegroundColor DarkGray

    $svcs = @(
        @{N="Backend (FastAPI)"; P=8000; U="http://localhost:8000/health"},
        @{N="Frontend (Vite)";   P=5173; U="http://localhost:5173"},
        @{N="Worker PWA";        P=4173; U=$null},
        @{N="Prometheus";        P=9090; U=$null},
        @{N="Ollama";            P=11434;U="http://localhost:11434/api/tags"}
    )
    foreach ($s in $svcs) {
        $label = "  {0,-16} {1,-7} " -f $s.N, $s.P
        try {
            $tcp = New-Object Net.Sockets.TcpClient; $tcp.Connect("127.0.0.1", $s.P); $tcp.Close()
            Write-Host $label -NoNewline
            Write-Host "RUNNING" -ForegroundColor Green
        } catch {
            Write-Host $label -NoNewline
            Write-Host "STOPPE" -ForegroundColor Red
        }
    }
    Write-Host ""
    exit 0
}

# ══════════════════════════════════════════════════════════════════════════════
#  -Logs
# ══════════════════════════════════════════════════════════════════════════════
if ($Logs) {
    $logFile = "$LogDir\backend.log"
    if (Test-Path $logFile) {
        Write-Host "  Streaming backend logs (Ctrl+C pour quitter)..." -ForegroundColor Cyan
        Get-Content $logFile -Wait -Tail 50
    } else {
        FAIL "Fichier log introuvable : $logFile"
        FAIL "Le backend n'a pas encore demarre."
    }
    exit 0
}

# ══════════════════════════════════════════════════════════════════════════════
#  START ALL SERVICES
# ══════════════════════════════════════════════════════════════════════════════
Banner
New-Item -ItemType Directory -Force $LogDir | Out-Null
New-Item -ItemType Directory -Force $PidDir | Out-Null

# ── Pre-flight checks ─────────────────────────────────────────────────────────
STEP "Verification des prerequis..."
$errors = @()
if (-not (Test-Path $Backend))  { $errors += "Dossier backend introuvable : $Backend" }
if (-not (Test-Path $Frontend)) { $errors += "Dossier frontend introuvable : $Frontend" }
try { & npm --version 2>$null | Out-Null } catch { $errors += "npm introuvable -- installez Node.js" }
try { & $Python --version 2>$null | Out-Null } catch { $errors += "Python introuvable : $Python" }

if ($errors.Count -gt 0) {
    foreach ($e in $errors) { FAIL $e }
    Read-Host "`n  Entree pour quitter"; exit 1
}
OK "Node + Python disponibles"
Write-Host ""

# ── 1. Ollama ─────────────────────────────────────────────────────────────────
STEP "[1] Ollama (LLM local)..."
try {
    $r = Invoke-RestMethod "http://localhost:11434/api/tags" -TimeoutSec 3
    OK "Ollama deja actif -- $($r.models.Count) modeles charges"
} catch {
    Write-Host "       Demarrage Ollama..." -ForegroundColor DarkGray
    Start-Process "ollama" -ArgumentList "serve" -WindowStyle Hidden
    Start-Sleep -Seconds 4
    try {
        $r = Invoke-RestMethod "http://localhost:11434/api/tags" -TimeoutSec 5
        OK "Ollama demarre -- $($r.models.Count) modeles"
    } catch {
        Write-Host "  [--] Ollama indisponible -- fallback Groq cloud actif" -ForegroundColor Yellow
    }
}
Write-Host ""

# ── 2. Backend ────────────────────────────────────────────────────────────────
STEP "[2] Backend FastAPI :8000..."
Free-Port 8000; Start-Sleep -Milliseconds 300

$proc = Start-Window `
    -Title "SmartFarm | Backend :8000" `
    -WorkDir $Backend `
    -Cmd "& '$Python' -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

if ($proc) { Save-PID "backend" $proc.Id }

if (Wait-Port 8000 35 "Backend") {
    try {
        $h = Invoke-RestMethod "http://127.0.0.1:8000/health" -TimeoutSec 5
        OK "Backend sain -- status: $($h.status)"
    } catch { OK "Backend port ouvert" }
} else {
    FAIL "Backend n'a pas demarre -- verifiez la fenetre Backend"
    Read-Host "Entree pour quitter"; exit 1
}
Write-Host ""

# ── 3. Frontend Owner Dashboard ───────────────────────────────────────────────
STEP "[3] Frontend Owner Dashboard :5173..."
Free-Port 5173; Start-Sleep -Milliseconds 200

$proc = Start-Window `
    -Title "SmartFarm | Dashboard :5173" `
    -WorkDir $Frontend `
    -Cmd "npm run dev"

if ($proc) { Save-PID "frontend" $proc.Id }

if (Wait-Port 5173 45 "Frontend") {
    OK "Dashboard pret"
} else {
    FAIL "Frontend n'a pas demarre -- verifiez la fenetre Dashboard"
}
Write-Host ""

# ── 4. Worker PWA (build + preview) ──────────────────────────────────────────
STEP "[4] Worker PWA :4173 (build en cours)..."
$proc = Start-Window `
    -Title "SmartFarm | Worker PWA :4173" `
    -WorkDir $Frontend `
    -Cmd "npm run build; if (`$LASTEXITCODE -eq 0) { npm run mobile } else { Write-Host 'BUILD ECHOUE' -ForegroundColor Red }"

if ($proc) { Save-PID "pwa" $proc.Id }
Write-Host "       Build en arriere-plan (1-2 min)..." -ForegroundColor DarkGray
Write-Host ""

# ── 5. Prometheus (optionnel) ─────────────────────────────────────────────────
$promExe = Join-Path $Root "monitoring\prometheus.exe"
$promCfg = Join-Path $Root "monitoring\prometheus.yml"
if ((Test-Path $promExe) -and (Test-Path $promCfg)) {
    STEP "[5] Prometheus :9090..."
    Free-Port 9090
    $proc = Start-Process $promExe `
        -ArgumentList "--config.file=$promCfg", "--storage.tsdb.path=$Root\monitoring\data", "--web.enable-lifecycle" `
        -WindowStyle Hidden -PassThru
    if ($proc) { Save-PID "prometheus" $proc.Id }
    if (Wait-Port 9090 15 "Prometheus") {
        OK "Prometheus pret"
    } else {
        Write-Host "  [--] Prometheus lent -- verifiez monitoring\prometheus.log" -ForegroundColor Yellow
    }
    Write-Host ""
}

# ── 6. Firewall (silencieux si pas admin) ─────────────────────────────────────
foreach ($p in @(8000, 5173, 4173)) {
    if (-not (Get-NetFirewallRule -DisplayName "SmartFarm $p" -ErrorAction SilentlyContinue)) {
        try {
            New-NetFirewallRule -DisplayName "SmartFarm $p" -Direction Inbound `
                -Protocol TCP -LocalPort $p -Action Allow -ErrorAction Stop | Out-Null
        } catch {}
    }
}

# ── 7. Ouvrir le navigateur ───────────────────────────────────────────────────
Start-Sleep -Seconds 2
Start-Process "http://localhost:5173"

# ── 8. Recap ──────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  ============================================================" -ForegroundColor Green
Write-Host "  SMART FARM AI -- TOUS LES SERVICES LANCES" -ForegroundColor Green
Write-Host "  ============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "   Dashboard Owner  ->  http://localhost:5173" -ForegroundColor White
Write-Host "   API (Swagger)    ->  http://localhost:8000/docs" -ForegroundColor White
Write-Host "   Metrics          ->  http://localhost:8000/metrics" -ForegroundColor White
Write-Host "   Prometheus       ->  http://localhost:9090" -ForegroundColor White
Write-Host "   Grafana Cloud    ->  https://medsayari2001.grafana.net" -ForegroundColor White
Write-Host "   Worker PWA (LAN) ->  https://${LocalIP}:4173/worker-login" -ForegroundColor Magenta
Write-Host ""
Write-Host "   Connexion Owner  :  admin / admin123" -ForegroundColor Yellow
Write-Host "   Connexion Worker :  OTP WhatsApp" -ForegroundColor Yellow
Write-Host ""
Write-Host "  ============================================================" -ForegroundColor Green
Write-Host "  Commandes utiles:" -ForegroundColor DarkGray
Write-Host "    .\start_all.ps1 -Status   # etat des services" -ForegroundColor DarkGray
Write-Host "    .\start_all.ps1 -Logs     # logs backend en direct" -ForegroundColor DarkGray
Write-Host "    .\start_all.ps1 -Stop     # arreter tout proprement" -ForegroundColor DarkGray
Write-Host "    .\start_all.ps1 -Restart  # redemarrage complet" -ForegroundColor DarkGray
Write-Host "  ============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Pour arreter : .\start_all.ps1 -Stop" -ForegroundColor DarkGray
Write-Host "  (ou fermez les 4 fenetres de terminal)" -ForegroundColor DarkGray
Write-Host ""
Read-Host "  Appuyez sur Entree pour fermer ce lanceur"
