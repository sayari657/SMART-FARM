#Requires -Version 5.1
# FARM AI -- Full Stack Launcher
# Usage: powershell -ExecutionPolicy Bypass -File start_farm.ps1

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
$Root     = $PSScriptRoot
$Backend  = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"
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
Write-Host "  ============================================================" -ForegroundColor Green
Write-Host "       FARM AI  --  Smart Agriculture Platform" -ForegroundColor Green
Write-Host "  ============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "   [1] Backend  API  : " -NoNewline -ForegroundColor Gray
Write-Host "http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "   [2] Owner Dashboard: " -NoNewline -ForegroundColor Gray
Write-Host "http://localhost:5173" -ForegroundColor Cyan
Write-Host "       desktop, hot reload, dev mode" -ForegroundColor DarkGray
Write-Host ""
Write-Host "   [3] Worker PWA     : " -NoNewline -ForegroundColor Gray
Write-Host "http://${LocalIP}:4173/worker-login" -ForegroundColor Magenta
Write-Host "       mobile, production build, full PWA" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  ============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  >> Give workers: http://${LocalIP}:4173/worker-login" -ForegroundColor Yellow
Write-Host ""
Write-Host "  NOTE: Worker PWA window runs a build first, about 30 seconds." -ForegroundColor DarkGray
Write-Host "        Owner dashboard starts immediately." -ForegroundColor DarkGray
Write-Host ""

# ---------------------------------------------------------------------------
# Pre-flight checks
# ---------------------------------------------------------------------------
$Fail = @()
if (-not (Test-Path $Backend))  { $Fail += "Backend folder not found : $Backend" }
if (-not (Test-Path $Frontend)) { $Fail += "Frontend folder not found: $Frontend" }

$npmVer = $null
try { $npmVer = & npm --version 2>$null } catch {}
if (-not $npmVer) { $Fail += "npm not found -- install Node.js first." }

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

Write-Host "  Pre-flight OK -- launching all servers..." -ForegroundColor Green
Write-Host ""

# ---------------------------------------------------------------------------
# Open firewall ports for LAN access (mobile phones on the same WiFi)
# ---------------------------------------------------------------------------
$ports = @(8000, 5173, 4173)
foreach ($port in $ports) {
    $rule = Get-NetFirewallRule -DisplayName "FARM AI $port" -ErrorAction SilentlyContinue
    if (-not $rule) {
        try {
            New-NetFirewallRule -DisplayName "FARM AI $port" -Direction Inbound -Protocol TCP -LocalPort $port -Action Allow -ErrorAction Stop | Out-Null
            Write-Host "  [FW] Port $port opened for LAN access" -ForegroundColor DarkGreen
        } catch {
            Write-Host "  [FW] Could not open port $port (run as Admin to enable mobile access)" -ForegroundColor DarkYellow
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
# 1. Backend
# ---------------------------------------------------------------------------
Write-Host "  [1/3] Starting Backend on :8000 ..." -ForegroundColor Cyan
Start-Server `
    -Title "FARM AI | Backend 8000" `
    -WorkDir $Backend `
    -Cmd "& '$Python' -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

Start-Sleep -Milliseconds 800

# ---------------------------------------------------------------------------
# 2. Owner dashboard (dev server, hot reload)
# ---------------------------------------------------------------------------
Write-Host "  [2/3] Starting Owner Dashboard on :5173 ..." -ForegroundColor Cyan
Start-Server `
    -Title "FARM AI | Owner Dashboard 5173" `
    -WorkDir $Frontend `
    -Cmd "npm run dev"

Start-Sleep -Milliseconds 500

# ---------------------------------------------------------------------------
# 3. Worker PWA (production build then preview)
# ---------------------------------------------------------------------------
Write-Host "  [3/3] Building Worker PWA then starting on :4173 ..." -ForegroundColor Magenta
Start-Server `
    -Title "FARM AI | Worker PWA 4173" `
    -WorkDir $Frontend `
    -Cmd "npm run build; if (`$LASTEXITCODE -eq 0) { npm run mobile } else { Write-Host 'BUILD FAILED' -ForegroundColor Red; Read-Host 'Press Enter to close' }"

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "  All 3 servers launched in separate windows." -ForegroundColor Green
Write-Host ""
Write-Host "  Backend  : http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "  Owner    : http://localhost:5173" -ForegroundColor Cyan
Write-Host "  Worker   : http://${LocalIP}:4173/worker-login" -ForegroundColor Magenta
Write-Host ""
Write-Host "  To stop: close the 3 server windows." -ForegroundColor DarkGray
Write-Host ""
Read-Host "Press Enter to close this launcher"
