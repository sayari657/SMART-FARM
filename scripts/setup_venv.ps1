# Smart Farm AI: Virtual Environment Setup
Write-Host "--- Setting up Virtual Environment ---" -ForegroundColor Cyan

# Find the best Python (prefer 3.13 as it worked for installs)
$pythonPath = "python"
if (test-path "C:\Program Files\Python313\python.exe") {
    $pythonPath = "C:\Program Files\Python313\python.exe"
}

Write-Host "Using Python: $pythonPath"

# Create .venv in root
& $pythonPath -m venv .venv

if ($LASTEXITCODE -eq 0) {
    Write-Host "Virtual environment created at .venv" -ForegroundColor Green
    Write-Host "To activate, run: .\.venv\Scripts\Activate.ps1" -ForegroundColor Yellow
} else {
    Write-Host "Failed to create virtual environment." -ForegroundColor Red
}
