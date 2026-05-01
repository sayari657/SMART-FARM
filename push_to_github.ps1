#Requires -Version 5.1
# FARM AI -- Push project to GitHub (required before deploying to Render/Vercel/Railway)
# Usage: powershell -ExecutionPolicy Bypass -File push_to_github.ps1

$Root = $PSScriptRoot

Clear-Host
Write-Host ""
Write-Host "  ============================================================" -ForegroundColor Cyan
Write-Host "       FARM AI  --  Push to GitHub" -ForegroundColor Cyan
Write-Host "  ============================================================" -ForegroundColor Cyan
Write-Host ""

# Check git is installed
try { & git --version | Out-Null } catch {
    Write-Host "  [ERR] git not found. Install from https://git-scm.com" -ForegroundColor Red
    Read-Host "Press Enter to exit"; exit 1
}

# ── Step 1: GitHub repo URL ────────────────────────────────────────────────
Write-Host "  Step 1 of 3 -- GitHub repository" -ForegroundColor Yellow
Write-Host ""
Write-Host "  If you have NOT created the repo yet:" -ForegroundColor Gray
Write-Host "    1. Go to https://github.com/new" -ForegroundColor White
Write-Host "    2. Name it  farm-ai  (private or public)" -ForegroundColor White
Write-Host "    3. Do NOT initialise with README/gitignore" -ForegroundColor White
Write-Host "    4. Copy the URL and paste it below" -ForegroundColor White
Write-Host ""
$repoUrl = Read-Host "  Paste your GitHub repo URL (e.g. https://github.com/you/farm-ai)"
$repoUrl = $repoUrl.Trim()
if (-not $repoUrl) { Write-Host "  [ERR] No URL provided." -ForegroundColor Red; exit 1 }

# ── Step 2: Commit any pending changes ────────────────────────────────────
Write-Host ""
Write-Host "  Step 2 of 3 -- Committing files ..." -ForegroundColor Yellow
Set-Location $Root
& git init | Out-Null
& git add -A
$status = & git status --short
if ($status) {
    & git commit -m "chore: prepare for cloud deployment"
    Write-Host "  [OK]  Changes committed." -ForegroundColor Green
} else {
    Write-Host "  [OK]  Nothing new to commit." -ForegroundColor Green
}

# ── Step 3: Push ───────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  Step 3 of 3 -- Pushing to GitHub ..." -ForegroundColor Yellow

$remote = & git remote get-url origin 2>$null
if ($remote -and $remote -ne $repoUrl) {
    & git remote set-url origin $repoUrl
} elseif (-not $remote) {
    & git remote add origin $repoUrl
}

& git branch -M main
& git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "  ============================================================" -ForegroundColor Green
    Write-Host "  [SUCCESS] Code is on GitHub!" -ForegroundColor Green
    Write-Host ""
    Write-Host "  NEXT STEPS -- choose your free platform:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  A) RENDER + VERCEL (easiest, no Docker):" -ForegroundColor White
    Write-Host "     1. render.com -> New -> Blueprint -> connect this repo" -ForegroundColor Gray
    Write-Host "        Set SECRET_KEY, SMTP_*, GROQ_API_KEY in Render dashboard" -ForegroundColor Gray
    Write-Host "     2. vercel.com -> New Project -> import this repo -> /frontend" -ForegroundColor Gray
    Write-Host "        Set VITE_API_URL = https://farmai-backend.onrender.com/api/v1" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  B) RAILWAY (backend + DB in one place):" -ForegroundColor White
    Write-Host "     1. railway.app -> New -> Deploy from GitHub -> select /backend" -ForegroundColor Gray
    Write-Host "        Add a PostgreSQL plugin, set SECRET_KEY, SMTP_*, GROQ_API_KEY" -ForegroundColor Gray
    Write-Host "     2. vercel.com -> import repo -> /frontend" -ForegroundColor Gray
    Write-Host "        Set VITE_API_URL = https://<your-service>.up.railway.app/api/v1" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  C) ORACLE CLOUD (always-on VPS, truly free forever):" -ForegroundColor White
    Write-Host "     cloud.oracle.com -> Create VM -> Always Free ARM -> SSH in" -ForegroundColor Gray
    Write-Host "     sudo apt install docker.io docker-compose-plugin" -ForegroundColor Gray
    Write-Host "     git clone <repo> && cd farm-ai" -ForegroundColor Gray
    Write-Host "     cp .env.production.example .env.production && nano .env.production" -ForegroundColor Gray
    Write-Host "     docker compose --env-file .env.production up -d --build" -ForegroundColor Gray
    Write-Host "  ============================================================" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "  [ERR] Push failed. Check your GitHub credentials." -ForegroundColor Red
    Write-Host "  Tip: use a Personal Access Token as the password." -ForegroundColor Yellow
    Write-Host "  github.com -> Settings -> Developer settings -> Personal access tokens" -ForegroundColor Gray
}

Write-Host ""
Read-Host "Press Enter to close"
