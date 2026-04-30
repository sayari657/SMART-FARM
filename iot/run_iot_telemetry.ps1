Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "   SMART FARM IoT - COLLECTEUR DE TÉLÉMÉTRIE   " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

Write-Host "`n[1] Vérification des dépendances Python..." -ForegroundColor Yellow
try {
    python -c "import serial" 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Installation de pyserial..." -ForegroundColor DarkYellow
        python -m pip install pyserial
    } else {
        Write-Host "pyserial est déjà installé." -ForegroundColor Green
    }
} catch {
    Write-Error "Python n'est pas installé ou inaccessible dans le PATH."
    Exit
}

Write-Host "`n[2] Ouverture des diagrammes Wokwi dans VS Code..." -ForegroundColor Yellow
code "$PSScriptRoot\node_a_pompe\diagram.json"
code "$PSScriptRoot\node_b_rucher\diagram.json"

Write-Host "`n[3] Lancement de l'enregistrement..." -ForegroundColor Yellow
Write-Host "Les données affluent toutes les 10 secondes." -ForegroundColor DarkGray
Write-Host "Appuyez sur Ctrl+C dans cette fenêtre pour arrêter.`n" -ForegroundColor Gray

# Execute Python script
python -u "$PSScriptRoot\log_telemetry.py"

