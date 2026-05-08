#Requires -Version 5.1
# FARM AI - Complete Launcher (Web + IoT Simulation)
# Starts: Backend + Owner Dashboard + Worker PWA + IoT Telemetry + Wokwi (VS Code)
# Usage:  powershell -ExecutionPolicy Bypass -File start_all.ps1

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
$Root     = $PSScriptRoot
$Backend  = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"
$Iot      = Join-Path $Root "iot"
$VEnv     = Join-Path $Backend ".venv\Scripts\python.exe"
$Python   = if (Test-Path $VEnv) { $VEnv } else { "python" }

# ---------------------------------------------------------------------------
# Detect local IP (default route interface)
# ---------------------------------------------------------------------------
try {
    $iface   = (Get-NetRoute -DestinationPrefix '0.0.0.0/0' | Sort-Object RouteMetric | Select-Object -First 1).InterfaceIndex
    $LocalIP = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceIndex $iface -ErrorAction Stop).IPAddress
} catch {
    $LocalIP = $null
}
if (-not $LocalIP) {
    $LocalIP = (Get-NetIPAddress -AddressFamily IPv4 |
        Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.*' } |
        Select-Object -First 1).IPAddress
}
if (-not $LocalIP) { $LocalIP = "localhost" }

# ---------------------------------------------------------------------------
# Banner
# ---------------------------------------------------------------------------
Clear-Host
Write-Host ""
Write-Host "  ================================================================" -ForegroundColor Green
Write-Host "       FARM AI  --  Smart Agriculture Platform  +  IoT Sim" -ForegroundColor Green
Write-Host "  ================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "   WEB SERVERS" -ForegroundColor DarkGray
Write-Host "   [1] Backend  API      : " -NoNewline -ForegroundColor Gray
Write-Host "http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "   [2] Owner Dashboard   : " -NoNewline -ForegroundColor Gray
Write-Host "http://localhost:5173" -ForegroundColor Cyan
Write-Host "   [3] Worker PWA (HTTPS) : " -NoNewline -ForegroundColor Gray
Write-Host "https://${LocalIP}:4173/worker-login" -ForegroundColor Magenta
Write-Host ""
Write-Host "   IOT SIMULATION" -ForegroundColor DarkGray
Write-Host "   Telemetry dashboard   : " -NoNewline -ForegroundColor Gray
Write-Host "http://localhost:5173/telemetry" -ForegroundColor Cyan
Write-Host ""
Write-Host "  ================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  NOTE: Worker PWA builds first (~30 s) before opening." -ForegroundColor DarkGray
Write-Host ""

# ---------------------------------------------------------------------------
# Pre-flight checks
# ---------------------------------------------------------------------------
$Fail = @()
if (-not (Test-Path $Backend))  { $Fail += "Backend folder not found  : $Backend" }
if (-not (Test-Path $Frontend)) { $Fail += "Frontend folder not found : $Frontend" }
if (-not (Test-Path $Iot))      { $Fail += "IoT folder not found      : $Iot" }

$npmVer = $null
try { $npmVer = & npm --version 2>$null } catch {}
if (-not $npmVer) { $Fail += "npm not found - install Node.js first." }

$pyVer = $null
try { $pyVer = & $Python --version 2>$null } catch {}
if (-not $pyVer) { $Fail += "Python not found at: $Python" }

if ($Fail.Count -gt 0) {
    Write-Host "  PRE-FLIGHT ERRORS:" -ForegroundColor Red
    $Fail | ForEach-Object { Write-Host "    [!] $_" -ForegroundColor Red }
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "  Pre-flight OK - launching all components..." -ForegroundColor Green
Write-Host ""

# ---------------------------------------------------------------------------
# Open firewall ports for LAN access (mobile phones on the same WiFi)
# ---------------------------------------------------------------------------
$ports = @(8000, 5173, 4173, 4000, 4001)
foreach ($port in $ports) {
    $rule = Get-NetFirewallRule -DisplayName "FARM AI $port" -ErrorAction SilentlyContinue
    if (-not $rule) {
        try {
            New-NetFirewallRule -DisplayName "FARM AI $port" -Direction Inbound `
                -Protocol TCP -LocalPort $port -Action Allow -ErrorAction Stop | Out-Null
            Write-Host "  [FW] Port $port opened" -ForegroundColor DarkGreen
        } catch {
            Write-Host "  [FW] Port $port - run as Admin to open for LAN" -ForegroundColor DarkGray
        }
    }
}
Write-Host ""

# ---------------------------------------------------------------------------
# Helper: spawn a new PowerShell window
# ---------------------------------------------------------------------------
function Start-Server {
    param(
        [string]$Title,
        [string]$WorkDir,
        [string]$Cmd
    )
    $wrapped = "cd '$WorkDir'; `$Host.UI.RawUI.WindowTitle = '$Title'; $Cmd"
    Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $wrapped
}

# ---------------------------------------------------------------------------
# [1/5] Backend API
# ---------------------------------------------------------------------------
Write-Host "  [1/5] Starting Backend on :8000 ..." -ForegroundColor Cyan
Start-Server `
    -Title "FARM AI | Backend 8000" `
    -WorkDir $Backend `
    -Cmd "& '$Python' -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

Start-Sleep -Milliseconds 800

# ---------------------------------------------------------------------------
# [2/5] Owner Dashboard (hot reload dev server)
# ---------------------------------------------------------------------------
Write-Host "  [2/5] Starting Owner Dashboard on :5173 ..." -ForegroundColor Cyan
Start-Server `
    -Title "FARM AI | Owner Dashboard 5173" `
    -WorkDir $Frontend `
    -Cmd "npm run dev"

Start-Sleep -Milliseconds 500

# ---------------------------------------------------------------------------
# [3/5] Worker PWA (production build then preview)
# ---------------------------------------------------------------------------
Write-Host "  [3/5] Building Worker PWA then starting on :4173 ..." -ForegroundColor Magenta
Start-Server `
    -Title "FARM AI | Worker PWA 4173" `
    -WorkDir $Frontend `
    -Cmd "npm run build; if (`$LASTEXITCODE -eq 0) { npm run mobile } else { Write-Host 'BUILD FAILED' -ForegroundColor Red; Read-Host 'Press Enter to close' }"

Start-Sleep -Milliseconds 400

# ---------------------------------------------------------------------------
# [4/5] IoT Telemetry Collector
# ---------------------------------------------------------------------------
Write-Host "  [4/5] Starting IoT Telemetry Collector (TCP 4000 + 4001) ..." -ForegroundColor Yellow
Start-Server `
    -Title "FARM AI | IoT Telemetry" `
    -WorkDir $Root `
    -Cmd "Write-Host '== IoT Telemetry Collector ==' -ForegroundColor Cyan; Write-Host 'Waiting for Wokwi Serial on TCP 4000 (Node A) + 4001 (Node B)...' -ForegroundColor DarkGray; Write-Host ''; & '$Python' -u '$Iot\log_telemetry.py'"

Start-Sleep -Milliseconds 300

# ---------------------------------------------------------------------------
# Final summary
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "  ================================================================" -ForegroundColor Green
Write-Host "  All components launched.
  ================================================================

   Backend         http://localhost:8000/docs
   Owner Dashboard http://localhost:5173
   Worker PWA      http://${LocalIP}:4173/worker-login
   Telemetry page  http://localhost:5173/telemetry

  ================================================================
  IoT Telemetry window connects automatically on TCP 4000+4001.
" -ForegroundColor Green
Write-Host "  ================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  To stop: close the 4 server windows." -ForegroundColor DarkGray
Write-Host ""
Read-Host "Press Enter to close this launcher"
