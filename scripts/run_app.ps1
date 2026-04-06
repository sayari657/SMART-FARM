# Use absolute path for virtual environment if it exists
$pythonCmd = "python"
if (Test-Path ".venv\Scripts\python.exe") {
    $pythonCmd = (Resolve-Path ".venv\Scripts\python.exe").Path
    Write-Host "Using Absolute Venv: $pythonCmd" -ForegroundColor Gray
}

# 1. Start Backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; & '$pythonCmd' -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload" -WindowStyle Normal

# 2. Start Frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev" -WindowStyle Normal

# 3. Start Workers
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd workers; & '$pythonCmd' ingestion/simulator.py" -WindowStyle Normal

# 4. Start CV Simulator
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd workers; & '$pythonCmd' cv/cv_simulator.py" -WindowStyle Normal

Write-Host "Monitoring Backend (8000), Frontend (5173), and Simulators..." -ForegroundColor Cyan
