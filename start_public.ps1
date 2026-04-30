#Requires -Version 5.1
# FARM AI -- Public Access via Cloudflare Quick Tunnel
# Exposes the app to the internet over HTTPS. No account needed.
# Usage: powershell -ExecutionPolicy Bypass -File start_public.ps1

$Root     = $PSScriptRoot
$Backend  = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"
$VEnv     = Join-Path $Backend ".venv\Scripts\python.exe"
$Python   = if (Test-Path $VEnv) { $VEnv } else { "python" }
$CFExe    = Join-Path $Root "cloudflared.exe"

Clear-Host
Write-Host ""
Write-Host "  ============================================================" -ForegroundColor Green
Write-Host "       FARM AI  --  Public Internet Access" -ForegroundColor Green
Write-Host "       Powered by Cloudflare Quick Tunnel (HTTPS)" -ForegroundColor Green
Write-Host "  ============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  This script makes your local app accessible from anywhere" -ForegroundColor Cyan
Write-Host "  on the internet -- no VPN, no port forwarding needed." -ForegroundColor Cyan
Write-Host ""

# ---------------------------------------------------------------------------
# Step 1 -- Download cloudflared (one-time, ~30 MB)
# ---------------------------------------------------------------------------
if (-not (Test-Path $CFExe)) {
    Write-Host "  [1/4] Downloading cloudflared.exe (first-time only) ..." -ForegroundColor Yellow
    $url = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
    try {
        Invoke-WebRequest -Uri $url -OutFile $CFExe -UseBasicParsing
        Write-Host "  [OK]  cloudflared downloaded." -ForegroundColor Green
    } catch {
        Write-Host "  [ERR] Download failed. Get it manually from:" -ForegroundColor Red
        Write-Host "        https://github.com/cloudflare/cloudflared/releases/latest" -ForegroundColor Yellow
        Read-Host "Press Enter to exit"
        exit 1
    }
} else {
    Write-Host "  [1/4] cloudflared.exe already present." -ForegroundColor Green
}
Write-Host ""

# ---------------------------------------------------------------------------
# Step 2 -- Start Backend in a new window
# ---------------------------------------------------------------------------
Write-Host "  [2/4] Starting Backend (port 8000) ..." -ForegroundColor Cyan
$backendCmd = "cd '$Backend'; `$Host.UI.RawUI.WindowTitle = 'FARM AI | Backend 8000'; & '$Python' -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $backendCmd
Start-Sleep -Seconds 2

# ---------------------------------------------------------------------------
# Step 3 -- Start Frontend Dev Server in a new window
# ---------------------------------------------------------------------------
Write-Host "  [3/4] Starting Frontend (port 5173) ..." -ForegroundColor Cyan
$frontendCmd = "cd '$Frontend'; `$Host.UI.RawUI.WindowTitle = 'FARM AI | Frontend 5173'; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $frontendCmd
Start-Sleep -Seconds 3

# ---------------------------------------------------------------------------
# Step 4 -- Start Cloudflare Tunnel (HTTPS -> port 5173)
# NOTE: The Vite dev server (5173) already proxies /api/* to the backend.
#       We only need ONE tunnel for the frontend -- everything routes correctly.
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "  [4/4] Opening Cloudflare Quick Tunnel ..." -ForegroundColor Magenta
Write-Host ""
Write-Host "  ============================================================" -ForegroundColor Yellow
Write-Host "  WATCH FOR THE PUBLIC URL BELOW -- it looks like:" -ForegroundColor Yellow
Write-Host "  https://random-words-here.trycloudflare.com" -ForegroundColor White
Write-Host ""
Write-Host "  Share that URL with ANYONE -- works from a phone, tablet," -ForegroundColor Yellow
Write-Host "  or any browser, anywhere in the world." -ForegroundColor Yellow
Write-Host ""
Write-Host "  Worker login:  <public-url>/worker-login" -ForegroundColor Cyan
Write-Host "  Owner dash:    <public-url>/dashboard" -ForegroundColor Cyan
Write-Host ""
Write-Host "  NOTE: URL changes each time you restart. For a permanent" -ForegroundColor DarkGray
Write-Host "        domain, see docker-compose.yml (enterprise setup)." -ForegroundColor DarkGray
Write-Host "  ============================================================" -ForegroundColor Yellow
Write-Host ""

# Run tunnel in this window so the URL is visible here
& $CFExe tunnel --url http://localhost:5173
