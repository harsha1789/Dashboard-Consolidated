@echo off
REM ============================================
REM Betway Tanzania Load Test Runner (Windows)
REM ============================================

echo.
echo ==========================================
echo    BETWAY TANZANIA LOAD TEST
echo ==========================================
echo.

REM Check if k6 is installed
where k6 >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] k6 is not installed!
    echo.
    echo Please install k6:
    echo   1. Download from: https://dl.k6.io/msi/k6-latest-amd64.msi
    echo   2. Or use Chocolatey: choco install k6
    echo   3. Or use Winget: winget install k6
    echo.
    pause
    exit /b 1
)

echo k6 is installed. Version:
k6 version
echo.

REM Menu
echo Select test type:
echo   1. Quick Test (100 VUs, 1 minute)
echo   2. Medium Test (500 VUs, 3 minutes)
echo   3. Full Test (4000 VUs, 8 minutes)
echo   4. Custom Test
echo   5. Exit
echo.

set /p choice="Enter choice (1-5): "

if "%choice%"=="1" (
    echo.
    echo Starting Quick Test: 100 VUs for 1 minute...
    k6 run --vus 100 --duration 1m k6-betway-loadtest.js
) else if "%choice%"=="2" (
    echo.
    echo Starting Medium Test: 500 VUs for 3 minutes...
    k6 run --vus 500 --duration 3m k6-betway-loadtest.js
) else if "%choice%"=="3" (
    echo.
    echo Starting Full Test: 4000 VUs for 8 minutes...
    echo WARNING: This is a heavy load test!
    set /p confirm="Are you sure? (y/n): "
    if /i "%confirm%"=="y" (
        k6 run k6-betway-loadtest.js
    ) else (
        echo Test cancelled.
    )
) else if "%choice%"=="4" (
    set /p vus="Enter number of Virtual Users: "
    set /p duration="Enter duration (e.g., 5m, 30s): "
    echo.
    echo Starting Custom Test: %vus% VUs for %duration%...
    k6 run --vus %vus% --duration %duration% k6-betway-loadtest.js
) else if "%choice%"=="5" (
    echo Exiting...
    exit /b 0
) else (
    echo Invalid choice!
)

echo.
echo ==========================================
echo    TEST COMPLETED
echo ==========================================
echo.
echo Results saved to:
echo   - loadtest-summary.json
echo   - loadtest-results.json
echo.
pause
