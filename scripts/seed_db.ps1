# Smart Farm AI: Database Seeder
Write-Host "--- Seeding Smart Farm AI Database ---" -ForegroundColor Cyan

# Use absolute path for virtual environment if it exists
$pythonCmd = "python"
if (Test-Path ".venv\Scripts\python.exe") {
    $pythonCmd = (Resolve-Path ".venv\Scripts\python.exe").Path
}

# Ensure backend exists and has .env
if (-not (Test-Path "backend\.env")) {
    Write-Host "Copying .env.example to .env..."
    Copy-Item ".env.example" "backend\.env"
}

# Run the seeding script
$env:PYTHONPATH = "backend"
& $pythonCmd -m app.utils.seed

if ($LASTEXITCODE -eq 0) {
    Write-Host "Database Successfully Seeded!" -ForegroundColor Green
} else {
    Write-Host "Seeding Failed. Ensure PostgreSQL is running on localhost:5432 or check .env" -ForegroundColor Red
}
