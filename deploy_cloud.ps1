# Smart Farm AI — one-click cloud bring-up.
# Restarts the backend + a Cloudflare Quick Tunnel, bakes the fresh tunnel URL
# into the frontend, rebuilds and redeploys to Cloudflare Pages (farmai-7ye).
#
# Run:  powershell -ExecutionPolicy Bypass -File deploy_cloud.ps1
#
# Why this exists: a Quick Tunnel URL changes every restart and the PC must stay
# on. This automates the whole "Backend hors ligne" recovery in one go.

$ErrorActionPreference = "Stop"
$Root     = $PSScriptRoot
$Backend  = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"
$Py       = Join-Path $Root ".venv\Scripts\python.exe"
if (-not (Test-Path $Py)) { $Py = "python" }
$CF       = Join-Path $Root "cloudflared.exe"

function Stop-Port($port) {
  Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object {
      Get-CimInstance Win32_Process -Filter "ParentProcessId=$_" -EA SilentlyContinue |
        ForEach-Object { Stop-Process -Id $_.ProcessId -Force -EA SilentlyContinue }
      Stop-Process -Id $_ -Force -EA SilentlyContinue
    }
}

Write-Host "[1/6] Arret des anciens backend / tunnel..." -ForegroundColor Cyan
Stop-Port 8000
Get-Process cloudflared -EA SilentlyContinue | Stop-Process -Force -EA SilentlyContinue
Start-Sleep 2

Write-Host "[2/6] Demarrage du backend (:8000)..." -ForegroundColor Cyan
Start-Process -FilePath $Py -ArgumentList "-m","uvicorn","app.main:app","--host","0.0.0.0","--port","8000" `
  -WorkingDirectory $Backend -WindowStyle Hidden

# Wait for the backend to answer /health
$ok = $false
foreach ($i in 1..40) {
  try { if ((Invoke-WebRequest "http://localhost:8000/health" -TimeoutSec 3 -UseBasicParsing).StatusCode -eq 200) { $ok = $true; break } } catch {}
  Start-Sleep 2
}
if (-not $ok) { Write-Host "  [!] Le backend n'a pas demarre a temps." -ForegroundColor Red; exit 1 }
Write-Host "  [OK] Backend en ligne." -ForegroundColor Green

Write-Host "[3/6] Ouverture du tunnel Cloudflare..." -ForegroundColor Cyan
$log = Join-Path $env:TEMP "cf_tunnel.log"
if (Test-Path $log) { Remove-Item $log -Force }
Start-Process -FilePath $CF -ArgumentList "tunnel","--url","http://localhost:8000","--no-autoupdate" `
  -RedirectStandardError $log -RedirectStandardOutput "$log.out" -WindowStyle Hidden

$url = $null
foreach ($i in 1..30) {
  Start-Sleep 2
  $hit = Select-String -Path $log,"$log.out" -Pattern "https://[a-z0-9-]+\.trycloudflare\.com" -EA SilentlyContinue |
         Select-Object -First 1
  if ($hit) { $url = [regex]::Match($hit.Line, "https://[a-z0-9-]+\.trycloudflare\.com").Value; break }
}
if (-not $url) { Write-Host "  [!] URL du tunnel introuvable." -ForegroundColor Red; exit 1 }
Write-Host "  [OK] Tunnel : $url" -ForegroundColor Green

Write-Host "[4/6] Ecriture de frontend/.env.production..." -ForegroundColor Cyan
$envFile = Join-Path $Frontend ".env.production"
@(
  "VITE_API_URL=$url/api/v1"
  "VITE_WS_URL=$($url -replace '^https','wss')"
) | Set-Content -Path $envFile -Encoding utf8

Write-Host "[5/6] Build du frontend..." -ForegroundColor Cyan
Push-Location $Frontend
npm run build
# Cloudflare Pages rejette les fichiers > 25 Mo (modeles .glb)
Get-ChildItem -Recurse dist -File | Where-Object { $_.Length -gt 25MB } | Remove-Item -Force -EA SilentlyContinue

Write-Host "[6/6] Deploiement sur Cloudflare Pages..." -ForegroundColor Cyan
npx --yes wrangler pages deploy dist --project-name farmai --branch main --commit-dirty=true
Pop-Location

Write-Host ""
Write-Host "  ============================================================" -ForegroundColor Green
Write-Host "   En ligne !  Backend tunnel : $url" -ForegroundColor Green
Write-Host "   Site        : https://farmai-7ye.pages.dev" -ForegroundColor Green
Write-Host "   (Laissez cette fenetre / le PC allumes pour garder le backend.)" -ForegroundColor Yellow
Write-Host "  ============================================================" -ForegroundColor Green
