@echo off
title Betway Load Test - Distributed Testing
color 0A

echo.
echo ============================================================
echo        BETWAY TANZANIA - DISTRIBUTED LOAD TEST
echo ============================================================
echo.

REM Check if k6 is installed
where k6 >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [ERROR] k6 is not installed!
    echo.
    echo Please install k6 first:
    echo   1. Download from: https://dl.k6.io/msi/k6-latest-amd64.msi
    echo   2. Run the installer
    echo   3. Restart this script
    echo.
    echo Or install via winget:
    echo   winget install k6
    echo.
    pause
    exit /b 1
)

echo [OK] k6 is installed
k6 version
echo.

REM Show IP address
echo Your IP Address (what the server will see):
powershell -command "(Invoke-WebRequest -Uri 'https://api.ipify.org' -UseBasicParsing).Content" 2>nul || echo Could not detect IP
echo.

echo ============================================================
echo   CONFIGURATION
echo ============================================================
echo   Target:     https://mobi.betway.co.tz
echo   Your VUs:   1000 virtual users
echo   Duration:   ~5 minutes
echo ============================================================
echo.

REM Countdown
echo The test will start in 10 seconds...
echo Press Ctrl+C to cancel.
echo.

for /L %%i in (10,-1,1) do (
    echo Starting in %%i...
    timeout /t 1 /nobreak >nul
)

echo.
echo ============================================================
echo   STARTING LOAD TEST - DO NOT CLOSE THIS WINDOW!
echo ============================================================
echo.

REM Run the test
k6 run betway-loadtest.js

echo.
echo ============================================================
echo   TEST COMPLETED!
echo ============================================================
echo.
echo Please take a screenshot of the results above
echo and send it to the test coordinator.
echo.
echo Results have also been saved to: loadtest-results.json
echo.
pause
