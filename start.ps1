# TURRET CBPM - Condition-Based Predictive Maintenance Platform Launcher
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "   TURRET CBPM - Condition-Based Predictive Maintenance Platform" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Detect Python
$pythonExe = "python"
if (Test-Path "$rootDir\venv\Scripts\python.exe") {
    $pythonExe = "$rootDir\venv\Scripts\python.exe"
} elseif (Test-Path "C:\Users\hp\.gemini\antigravity\scratch\turret-cbpm\venv\Scripts\python.exe") {
    $pythonExe = "C:\Users\hp\.gemini\antigravity\scratch\turret-cbpm\venv\Scripts\python.exe"
}

# Check Port 8000
$port8000Active = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
if ($port8000Active) {
    Write-Host "[1/3] Backend is already active on http://127.0.0.1:8000" -ForegroundColor Green
} else {
    Write-Host "[1/3] Starting FastAPI Backend on http://127.0.0.1:8000 ..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir\backend'; & '$pythonExe' -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
}

# Check Port 5173
$port5173Active = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue
if ($port5173Active) {
    Write-Host "[2/3] Frontend is already active on http://127.0.0.1:5173" -ForegroundColor Green
} else {
    Write-Host "[2/3] Starting React Vite Frontend on http://127.0.0.1:5173 ..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir\frontend'; npm run dev -- --host 0.0.0.0 --port 5173"
}

Write-Host "[3/3] Initializing browser connection..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

Write-Host "Opening platform in default browser: http://localhost:5173" -ForegroundColor Green
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host " Platform is online!" -ForegroundColor Green
Write-Host " - Web Application:  http://localhost:5173"
Write-Host " - Swagger API Docs: http://127.0.0.1:8000/docs"
Write-Host ""
Write-Host " Default Login Credentials:"
Write-Host "   Admin:      admin  / admin123"
Write-Host "   Technician: tech   / tech123"
Write-Host "   Viewer:     viewer / viewer123"
Write-Host "======================================================================" -ForegroundColor Cyan
