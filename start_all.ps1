#Requires -Version 5.1
# ============================================================
#  Smart Farm AI v3.0 -- Stable Launcher
#  Usage:
#    .\start_all.ps1                     # dev frontend (5173) only
#    .\start_all.ps1 -Mode preview       # production preview (4173) instead
#    .\start_all.ps1 -Cloud              # + expose publicly via Cloudflare Tunnel
#    .\start_all.ps1 -Mode preview -Cloud
#    .\start_all.ps1 -Stop               # stop all services
#    .\start_all.ps1 -Status             # show service status
#    .\start_all.ps1 -Logs               # stream backend logs
#    .\start_all.ps1 -Restart            # stop then start
# ============================================================
param(
    [ValidateSet('dev','preview')]
    [string]$Mode = 'dev',
    [switch]$Cloud,
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
$CFExe   = Join-Path $Root "cloudflared.exe"

# ── Single frontend mode: dev (5173) OR preview (4173) ─────────────────────────
$HasCerts = Test-Path (Join-Path $Frontend "certs\cert.pem")
if ($Mode -eq 'preview') {
    $FrontPort   = 4173
    $FrontCmd    = "npm run build; if (`$LASTEXITCODE -eq 0) { npm run mobile } else { Write-Host 'BUILD ECHOUE' -ForegroundColor Red }"
    $FrontScheme = "http"                                   # vite preview serves plain HTTP
    $FrontLabel  = "Preview (production build)"
} else {
    $FrontPort   = 5173
    $FrontCmd    = "npm run dev"
    $FrontScheme = if ($HasCerts) { "https" } else { "http" } # vite dev uses mkcert certs if present
    $FrontLabel  = "Dev (hot reload)"
}
$FrontUrl = "${FrontScheme}://localhost:$FrontPort"

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
    Kill-PID "pwa"
    Kill-PID "tunnel"
    Kill-PID "prometheus"
    Kill-PID "mlflow"
    Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Free-Port 8000
    Free-Port 5173
    Free-Port 4173
    Free-Port 5000
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
        @{N="MLflow UI";         P=5000; U="http://localhost:5000"},
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

# ── 3. Frontend (single port: dev 5173 OR preview 4173) ───────────────────────
STEP "[3] Frontend $FrontLabel :$FrontPort..."
Free-Port $FrontPort; Start-Sleep -Milliseconds 200

$proc = Start-Window `
    -Title "SmartFarm | Frontend :$FrontPort" `
    -WorkDir $Frontend `
    -Cmd $FrontCmd

if ($proc) { Save-PID "frontend" $proc.Id }

if ($Mode -eq 'preview') {
    Write-Host "       Build puis preview (1-2 min)..." -ForegroundColor DarkGray
}
$waitSecs = if ($Mode -eq 'preview') { 180 } else { 45 }
if (Wait-Port $FrontPort $waitSecs "Frontend") {
    OK "Frontend pret -- $FrontUrl"
} else {
    FAIL "Frontend n'a pas demarre -- verifiez la fenetre Frontend"
}
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

# ── 6. MLflow UI ─────────────────────────────────────────────────────────────
STEP "[6] MLflow UI :5000..."
Free-Port 5000; Start-Sleep -Milliseconds 200

$mlflowDbUri = "sqlite:///$Root\mlruns.db"
$proc = Start-Window `
    -Title "SmartFarm | MLflow UI :5000" `
    -WorkDir $Root `
    -Cmd "& '$Python' -m mlflow ui --backend-store-uri '$mlflowDbUri' --port 5000 --host 0.0.0.0"

if ($proc) { Save-PID "mlflow" $proc.Id }

if (Wait-Port 5000 20 "MLflow") {
    OK "MLflow UI pret"
} else {
    Write-Host "  [--] MLflow lent -- verifiez la fenetre MLflow" -ForegroundColor Yellow
}
Write-Host ""

# ── 7. Cloud : exposition publique via Cloudflare Tunnel (-Cloud) ─────────────
if ($Cloud) {
    STEP "[7] Cloudflare Tunnel (acces public HTTPS)..."

    if (-not (Test-Path $CFExe)) {
        Write-Host "       Telechargement de cloudflared.exe (premiere fois)..." -ForegroundColor DarkGray
        $cfUrl = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
        try { Invoke-WebRequest -Uri $cfUrl -OutFile $CFExe -UseBasicParsing }
        catch { FAIL "Telechargement cloudflared echoue -- recuperez-le manuellement." }
    }

    if (Test-Path $CFExe) {
        # One tunnel on the chosen frontend port: Vite proxies /api + /ws to the
        # backend, so a single public URL serves the whole app (no CORS setup).
        if ($FrontScheme -eq "https") {
            $tunnelCmd = "& '$CFExe' tunnel --url https://localhost:$FrontPort --no-tls-verify"
        } else {
            $tunnelCmd = "& '$CFExe' tunnel --url http://localhost:$FrontPort"
        }
        $proc = Start-Window -Title "SmartFarm | Cloudflare Tunnel" -WorkDir $Root -Cmd $tunnelCmd
        if ($proc) { Save-PID "tunnel" $proc.Id }
        OK "Tunnel lance -- URL publique https://*.trycloudflare.com dans la fenetre 'Cloudflare Tunnel'"
        INFO "L'URL change a chaque redemarrage. Partagez-la pour une demo."
    }
    Write-Host ""
}

# ── 8. Firewall (silencieux si pas admin) ─────────────────────────────────────
foreach ($p in @(8000, 5173, 4173, 5000)) {
    if (-not (Get-NetFirewallRule -DisplayName "SmartFarm $p" -ErrorAction SilentlyContinue)) {
        try {
            New-NetFirewallRule -DisplayName "SmartFarm $p" -Direction Inbound `
                -Protocol TCP -LocalPort $p -Action Allow -ErrorAction Stop | Out-Null
        } catch {}
    }
}

# ── 9. Ouvrir le navigateur ───────────────────────────────────────────────────
Start-Sleep -Seconds 2
Start-Process $FrontUrl

# ── 8. Recap ──────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  ============================================================" -ForegroundColor Green
Write-Host "  SMART FARM AI -- TOUS LES SERVICES LANCES" -ForegroundColor Green
Write-Host "  ============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "   Frontend ($Mode) ->  $FrontUrl" -ForegroundColor White
Write-Host "   App (LAN)        ->  ${FrontScheme}://${LocalIP}:$FrontPort" -ForegroundColor Magenta
Write-Host "   API (Swagger)    ->  http://localhost:8000/docs" -ForegroundColor White
Write-Host "   Metrics          ->  http://localhost:8000/metrics" -ForegroundColor White
Write-Host "   Prometheus       ->  http://localhost:9090" -ForegroundColor White
Write-Host "   MLflow UI        ->  http://localhost:5000" -ForegroundColor White
Write-Host "   Grafana Cloud    ->  https://medsayari2001.grafana.net" -ForegroundColor White
if ($Cloud) {
    Write-Host "   Acces public     ->  voir fenetre 'Cloudflare Tunnel' (*.trycloudflare.com)" -ForegroundColor Cyan
}
Write-Host ""
Write-Host "   Connexion Owner  :  admin / admin123" -ForegroundColor Yellow
Write-Host "   Connexion Worker :  OTP WhatsApp" -ForegroundColor Yellow
Write-Host ""
Write-Host "  ============================================================" -ForegroundColor Green
Write-Host "  Commandes utiles:" -ForegroundColor DarkGray
Write-Host "    .\start_all.ps1                  # dev (5173)" -ForegroundColor DarkGray
Write-Host "    .\start_all.ps1 -Mode preview    # preview prod (4173)" -ForegroundColor DarkGray
Write-Host "    .\start_all.ps1 -Cloud           # + acces public Cloudflare" -ForegroundColor DarkGray
Write-Host "    .\start_all.ps1 -Status          # etat des services" -ForegroundColor DarkGray
Write-Host "    .\start_all.ps1 -Logs            # logs backend en direct" -ForegroundColor DarkGray
Write-Host "    .\start_all.ps1 -Stop            # arreter tout proprement" -ForegroundColor DarkGray
Write-Host "    .\start_all.ps1 -Restart         # redemarrage complet" -ForegroundColor DarkGray
Write-Host "  ============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Pour arreter : .\start_all.ps1 -Stop" -ForegroundColor DarkGray
Write-Host "  (ou fermez les fenetres de terminal ouvertes)" -ForegroundColor DarkGray
Write-Host ""
Read-Host "  Appuyez sur Entree pour fermer ce lanceur"
