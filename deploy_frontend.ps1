# Smart Farm AI — redeploy the frontend to Cloudflare Pages.
# The backend now lives permanently on Hugging Face Spaces with a FIXED URL
# (baked in frontend/.env.production), so deploying is just: build → strip the
# >25 MB files Pages rejects → publish. No backend, no tunnel needed.
#
# Run:  powershell -ExecutionPolicy Bypass -File deploy_frontend.ps1

$ErrorActionPreference = "Stop"
$Frontend = Join-Path $PSScriptRoot "frontend"

Write-Host "[1/3] Build du frontend..." -ForegroundColor Cyan
Push-Location $Frontend
npm run build

Write-Host "[2/3] Retrait des fichiers > 25 Mo (limite Cloudflare Pages)..." -ForegroundColor Cyan
Get-ChildItem -Recurse dist -File | Where-Object { $_.Length -gt 25MB } | Remove-Item -Force -ErrorAction SilentlyContinue

Write-Host "[3/3] Deploiement sur Cloudflare Pages (projet farmai)..." -ForegroundColor Cyan
npx --yes wrangler pages deploy dist --project-name farmai --branch main --commit-dirty=true
Pop-Location

Write-Host ""
Write-Host "  ============================================================" -ForegroundColor Green
Write-Host "   Frontend deploye -> https://farmai-7ye.pages.dev" -ForegroundColor Green
Write-Host "   Backend (permanent) -> https://mohamedsayari-smartfarm-backend.hf.space" -ForegroundColor Green
Write-Host "  ============================================================" -ForegroundColor Green
