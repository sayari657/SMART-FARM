# Start MLflow Tracking Server UI
# S'assurer d'être à la racine du projet, d'où que le script soit lancé
$projectRoot = (Resolve-Path "$PSScriptRoot\..").Path
Set-Location $projectRoot

$env:PYTHONPATH = $projectRoot
Write-Host "🚀 Démarrage du serveur MLflow MLOps..." -ForegroundColor Green
Write-Host "Accédez à l'interface via : http://localhost:5000" -ForegroundColor Cyan

& ".\.venv\Scripts\mlflow.exe" ui --backend-store-uri sqlite:///mlruns.db --port 5000
