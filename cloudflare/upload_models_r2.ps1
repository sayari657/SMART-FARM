# Upload YOLO model weights to Cloudflare R2 (run after enabling R2 in dashboard).
#   1. Dashboard → R2 → Enable (free tier).
#   2. npx wrangler r2 bucket create farmai-models
#   3. (optional) connect a custom/public domain to the bucket for R2_MODELS_BASE_URL
#   4. .\cloudflare\upload_models_r2.ps1
$ErrorActionPreference = "Stop"
$Root   = Split-Path $PSScriptRoot -Parent
$Bucket = "farmai-models"
$weights = Get-ChildItem -Path (Join-Path $Root "ai_assets") -Recurse -Include best.pt,best.onnx -ErrorAction SilentlyContinue
Write-Host "Uploading $($weights.Count) model files to R2 bucket '$Bucket'..." -ForegroundColor Cyan
foreach ($w in $weights) {
    # Key = path relative to ai_assets, forward slashes
    $key = $w.FullName.Substring((Join-Path $Root "ai_assets").Length + 1).Replace("\", "/")
    Write-Host "  → $key" -ForegroundColor DarkGray
    npx wrangler r2 object put "$Bucket/$key" --file "$($w.FullName)"
}
Write-Host "Done. Set R2_MODELS_BASE_URL to your bucket's public URL." -ForegroundColor Green
