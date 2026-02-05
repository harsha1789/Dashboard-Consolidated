@echo off
title Betway Load Test - Custom Configuration
color 0B

echo.
echo ============================================================
echo        BETWAY LOAD TEST - CUSTOM CONFIGURATION
echo ============================================================
echo.

REM Check if k6 is installed
where k6 >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [ERROR] k6 is not installed!
    echo Download from: https://dl.k6.io/msi/k6-latest-amd64.msi
    pause
    exit /b 1
)

echo Current configuration in betway-loadtest.js:
echo   Default: 1000 virtual users, 5 minutes
echo.

echo Choose test size:
echo   1. Quick Test    (100 VUs, 1 minute)  - for testing setup
echo   2. Light Test    (250 VUs, 2 minutes) - low load
echo   3. Medium Test   (500 VUs, 3 minutes) - moderate load
echo   4. Standard Test (1000 VUs, 5 minutes) - normal load
echo   5. Heavy Test    (2000 VUs, 5 minutes) - high load
echo   6. Custom        (you specify)
echo.

set /p choice="Enter choice (1-6): "

if "%choice%"=="1" (
    set VUS=100
    set DURATION=1m
) else if "%choice%"=="2" (
    set VUS=250
    set DURATION=2m
) else if "%choice%"=="3" (
    set VUS=500
    set DURATION=3m
) else if "%choice%"=="4" (
    set VUS=1000
    set DURATION=5m
) else if "%choice%"=="5" (
    set VUS=2000
    set DURATION=5m
) else if "%choice%"=="6" (
    set /p VUS="Enter number of Virtual Users: "
    set /p DURATION="Enter duration (e.g., 1m, 5m, 30s): "
) else (
    echo Invalid choice, using defaults.
    set VUS=1000
    set DURATION=5m
)

echo.
echo ============================================================
echo   CONFIGURATION
echo ============================================================
echo   Target:     https://mobi.betway.co.tz
echo   Your VUs:   %VUS% virtual users
echo   Duration:   %DURATION%
echo ============================================================
echo.

echo Your IP Address:
powershell -command "(Invoke-WebRequest -Uri 'https://api.ipify.org' -UseBasicParsing).Content" 2>nul
echo.
echo.

echo Starting in 5 seconds... (Press Ctrl+C to cancel)
timeout /t 5 /nobreak >nul

echo.
echo Running load test...
echo.

k6 run --vus %VUS% --duration %DURATION% betway-loadtest.js

echo.
echo ============================================================
echo   TEST COMPLETED!
echo ============================================================
echo.
pause
