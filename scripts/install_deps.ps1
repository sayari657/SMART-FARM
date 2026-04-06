# Smart Farm AI: Dependency Installer
Write-Host "--- Installing Smart Farm AI Backend Dependencies ---" -ForegroundColor Cyan

# Use absolute path for virtual environment if it exists
$pythonCmd = "python"
if (Test-Path ".venv\Scripts\python.exe") {
    $pythonCmd = (Resolve-Path ".venv\Scripts\python.exe").Path
    Write-Host "Using Absolute Venv: $pythonCmd" -ForegroundColor Gray
}

# Upgrade pip
& $pythonCmd -m pip install --upgrade pip

# Install dependencies
# Using --only-binary to avoid C++ build errors on Windows
& $pythonCmd -m pip install -r backend/requirements.txt --only-binary :all:
if ($LASTEXITCODE -ne 0) {
    Write-Host "Trying standard install..." -ForegroundColor Yellow
    & $pythonCmd -m pip install -r backend/requirements.txt
}

Write-Host "--- Installation Complete ---" -ForegroundColor Green
