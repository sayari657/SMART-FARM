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
Write-Host "   [3] Worker PWA        : " -NoNewline -ForegroundColor Gray
Write-Host "http://${LocalIP}:4173/worker-login" -ForegroundColor Magenta
Write-Host ""
Write-Host "   IOT SIMULATION" -ForegroundColor DarkGray
Write-Host "   [4] Telemetry CSV     : " -NoNewline -ForegroundColor Gray
Write-Host "iot/iot_telemetry.csv  (TCP 4000 + 4001)" -ForegroundColor Yellow
Write-Host "   [5] Wokwi Node A      : " -NoNewline -ForegroundColor Gray
Write-Host "iot/node_a_pompe/diagram.json  (VS Code)" -ForegroundColor Yellow
Write-Host "   [5] Wokwi Node B      : " -NoNewline -ForegroundColor Gray
Write-Host "iot/node_b_rucher/diagram.json (VS Code)" -ForegroundColor Yellow
Write-Host ""
Write-Host "   Telemetry dashboard   : " -NoNewline -ForegroundColor Gray
Write-Host "http://localhost:5173/telemetry" -ForegroundColor Cyan
Write-Host ""
Write-Host "  ================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  NOTE: Worker PWA builds first (~30 s) before opening." -ForegroundColor DarkGray
Write-Host "        After VS Code opens, press [[>]] on each diagram tab" -ForegroundColor DarkGray
Write-Host "        to start the Wokwi simulation for that node." -ForegroundColor DarkGray
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

# Soft check for VS Code CLI
$codeCmd = Get-Command code -ErrorAction SilentlyContinue
if (-not $codeCmd) {
    Write-Host "  [WARN] 'code' not in PATH - Wokwi diagrams will not auto-open." -ForegroundColor DarkYellow
    Write-Host "         Add VS Code to PATH or open diagram.json files manually." -ForegroundColor DarkGray
    Write-Host ""
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
# [5/5] Compile firmware with PlatformIO then open Wokwi diagrams
# ---------------------------------------------------------------------------

# Check if PlatformIO CLI is available
$pioCmd = Get-Command pio -ErrorAction SilentlyContinue
if (-not $pioCmd) {
    # PlatformIO also installs as 'platformio'
    $pioCmd = Get-Command platformio -ErrorAction SilentlyContinue
}

if ($pioCmd) {
    $pioExe = $pioCmd.Source
    Write-Host "  [5/5] Compiling Node A firmware (PlatformIO) ..." -ForegroundColor Yellow
    & $pioExe run --project-dir "$Iot\node_a_pompe" --environment esp32dev
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [!] Node A build FAILED - check PlatformIO output above." -ForegroundColor Red
    } else {
        Write-Host "  [5/5] Node A firmware compiled OK." -ForegroundColor Green
    }

    Write-Host "  [5/5] Compiling Node B firmware (PlatformIO) ..." -ForegroundColor Yellow
    & $pioExe run --project-dir "$Iot\node_b_rucher" --environment esp32dev
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [!] Node B build FAILED - check PlatformIO output above." -ForegroundColor Red
    } else {
        Write-Host "  [5/5] Node B firmware compiled OK." -ForegroundColor Green
    }
} else {
    Write-Host "  [WARN] PlatformIO CLI not found." -ForegroundColor DarkYellow
    Write-Host "         Install: pip install platformio  OR  use PlatformIO VS Code extension." -ForegroundColor DarkGray
    Write-Host "         Then build each node manually before clicking Wokwi play." -ForegroundColor DarkGray
}

Write-Host ""

if ($codeCmd) {
    Write-Host "  [5/5] Opening Wokwi Node A in current VS Code window ..." -ForegroundColor Cyan
    & code --reuse-window "$Iot\node_a_pompe\diagram.json"
    Start-Sleep -Seconds 4

    & code --command wokwi-vscode.start 2>$null
    Start-Sleep -Seconds 1

    Write-Host "  [5/5] Opening Wokwi Node B in current VS Code window ..." -ForegroundColor Cyan
    & code --reuse-window "$Iot\node_b_rucher\diagram.json"
    Start-Sleep -Seconds 4

    & code --command wokwi-vscode.start 2>$null

    Write-Host "  [5/5] Wokwi diagrams opened." -ForegroundColor Green
} else {
    Write-Host "  [5/5] VS Code not in PATH - open these files manually:" -ForegroundColor Yellow
    Write-Host "        $Iot\node_a_pompe\diagram.json" -ForegroundColor Gray
    Write-Host "        $Iot\node_b_rucher\diagram.json" -ForegroundColor Gray
}

# ---------------------------------------------------------------------------
# Final summary
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "  ================================================================" -ForegroundColor Green
Write-Host "  All components launched." -ForegroundColor Green
Write-Host "  ================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "   Backend         http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "   Owner Dashboard http://localhost:5173" -ForegroundColor Cyan
Write-Host "   Worker PWA      http://${LocalIP}:4173/worker-login" -ForegroundColor Magenta
Write-Host "   Telemetry page  http://localhost:5173/telemetry" -ForegroundColor Cyan
Write-Host ""
Write-Host "  ================================================================" -ForegroundColor Green
Write-Host "  Wokwi simulations are running in your VS Code window." -ForegroundColor Green
Write-Host "  IoT Telemetry window connects automatically on TCP 4000+4001." -ForegroundColor Green
Write-Host "  ================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  To stop: close the 4 server windows + the VS Code simulations." -ForegroundColor DarkGray
Write-Host ""
Read-Host "Press Enter to close this launcher"
