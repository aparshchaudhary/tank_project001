@echo off
title TURRET CBPM Launcher
echo ======================================================================
echo    TURRET CBPM - Condition-Based Predictive Maintenance Platform
echo ======================================================================
echo.

set ROOT_DIR=%~dp0
cd /d "%ROOT_DIR%"

rem Python executable detection
set PYTHON_EXE=python
if exist "%ROOT_DIR%venv\Scripts\python.exe" (
    set PYTHON_EXE="%ROOT_DIR%venv\Scripts\python.exe"
) else if exist "C:\Users\hp\.gemini\antigravity\scratch\turret-cbpm\venv\Scripts\python.exe" (
    set PYTHON_EXE="C:\Users\hp\.gemini\antigravity\scratch\turret-cbpm\venv\Scripts\python.exe"
)

rem Check if Backend is already running on port 8000
netstat -ano | findstr /R /C:":8000 .*LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo [1/3] Backend is already running on http://127.0.0.1:8000
) else (
    echo [1/3] Starting FastAPI Backend on http://127.0.0.1:8000 ...
    start "TURRET CBPM - Backend (Port 8000)" cmd /k "cd /d %ROOT_DIR%backend && %PYTHON_EXE% -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
)

rem Check if Frontend is already running on port 5173
netstat -ano | findstr /R /C:":5173 .*LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo [2/3] Frontend is already running on http://127.0.0.1:5173
) else (
    echo [2/3] Starting React Vite Frontend on http://127.0.0.1:5173 ...
    start "TURRET CBPM - Frontend (Port 5173)" cmd /k "cd /d %ROOT_DIR%frontend && npm run dev -- --host 0.0.0.0 --port 5173"
)

echo [3/3] Initializing browser connection...
timeout /t 2 /nobreak >nul

echo Opening platform in default browser: http://localhost:5173
start http://localhost:5173

echo.
echo ======================================================================
echo  Platform is online!
echo  - Web Application:  http://localhost:5173
echo  - Swagger API Docs: http://127.0.0.1:8000/docs
echo.
echo  Default Login Credentials:
echo    Admin:      admin  / admin123
echo    Technician: tech   / tech123
echo    Viewer:     viewer / viewer123
echo ======================================================================
pause
