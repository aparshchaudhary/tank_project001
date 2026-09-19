@echo off
title Push TURRET CBPM to GitHub
echo ======================================================================
echo    TURRET CBPM - Push to GitHub Repository
echo ======================================================================
echo.

set ROOT_DIR=%~dp0
cd /d "%ROOT_DIR%"

echo Current Directory: %ROOT_DIR%
echo Remote Origin:
git remote -v
echo.

echo ----------------------------------------------------------------------
echo Pushing 'main' branch to GitHub...
echo (If prompted, sign in via your browser with your GitHub account)
echo ----------------------------------------------------------------------
echo.

git push -u origin main

if %errorlevel% neq 0 (
    echo.
    echo [Notice] If your GitHub repo was initialized with a README or license,
    echo attempting force push...
    echo.
    git push -u origin main --force
)

echo.
echo ======================================================================
echo  Push complete!
echo  Next step: Go to https://railway.com to deploy your repo!
echo ======================================================================
pause
