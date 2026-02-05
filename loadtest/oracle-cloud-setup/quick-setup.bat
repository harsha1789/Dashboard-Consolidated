@echo off
REM ============================================
REM Oracle Cloud VM Quick Setup Script
REM ============================================

echo.
echo ==========================================
echo   ORACLE CLOUD LOAD TEST SETUP
echo ==========================================
echo.

REM Check for SSH
where ssh >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] SSH is not available!
    echo Please install OpenSSH or use Windows 10/11 which includes it.
    pause
    exit /b 1
)

echo [OK] SSH is available
echo.

REM Get VM IPs from user
echo Enter your Oracle Cloud VM IP addresses:
echo (Leave blank and press Enter to skip a VM)
echo.

set /p VM1_IP="VM1 IP Address: "
set /p VM2_IP="VM2 IP Address: "
set /p VM3_IP="VM3 IP Address: "
set /p VM4_IP="VM4 IP Address: "

echo.
echo ==========================================
echo   STEP 1: Generate SSH Key (if needed)
echo ==========================================
echo.

if not exist "%USERPROFILE%\.ssh\oracle_k6_key" (
    echo Generating SSH key pair...
    ssh-keygen -t rsa -b 4096 -f "%USERPROFILE%\.ssh\oracle_k6_key" -N ""
    echo.
    echo [IMPORTANT] Copy this public key to Oracle Cloud:
    echo.
    type "%USERPROFILE%\.ssh\oracle_k6_key.pub"
    echo.
    echo Go to Oracle Cloud Console ^> Compute ^> Instances ^> Your VM ^>
    echo Console Connection ^> Create Local Connection ^> Paste this key
    echo.
    pause
) else (
    echo SSH key already exists at %USERPROFILE%\.ssh\oracle_k6_key
)

echo.
echo ==========================================
echo   STEP 2: Test Connections
echo ==========================================
echo.

if not "%VM1_IP%"=="" (
    echo Testing connection to VM1 (%VM1_IP%)...
    ssh -i "%USERPROFILE%\.ssh\oracle_k6_key" -o ConnectTimeout=10 -o StrictHostKeyChecking=no opc@%VM1_IP% "echo Connected to VM1"
)

if not "%VM2_IP%"=="" (
    echo Testing connection to VM2 (%VM2_IP%)...
    ssh -i "%USERPROFILE%\.ssh\oracle_k6_key" -o ConnectTimeout=10 -o StrictHostKeyChecking=no opc@%VM2_IP% "echo Connected to VM2"
)

if not "%VM3_IP%"=="" (
    echo Testing connection to VM3 (%VM3_IP%)...
    ssh -i "%USERPROFILE%\.ssh\oracle_k6_key" -o ConnectTimeout=10 -o StrictHostKeyChecking=no opc@%VM3_IP% "echo Connected to VM3"
)

if not "%VM4_IP%"=="" (
    echo Testing connection to VM4 (%VM4_IP%)...
    ssh -i "%USERPROFILE%\.ssh\oracle_k6_key" -o ConnectTimeout=10 -o StrictHostKeyChecking=no opc@%VM4_IP% "echo Connected to VM4"
)

echo.
echo ==========================================
echo   STEP 3: Install k6 on VMs
echo ==========================================
echo.

set K6_INSTALL_CMD=sudo dnf install -y https://dl.k6.io/rpm/repo.rpm; sudo dnf install -y k6; mkdir -p ~/loadtest; k6 version

if not "%VM1_IP%"=="" (
    echo Installing k6 on VM1...
    ssh -i "%USERPROFILE%\.ssh\oracle_k6_key" -o StrictHostKeyChecking=no opc@%VM1_IP% "%K6_INSTALL_CMD%"
)

if not "%VM2_IP%"=="" (
    echo Installing k6 on VM2...
    ssh -i "%USERPROFILE%\.ssh\oracle_k6_key" -o StrictHostKeyChecking=no opc@%VM2_IP% "%K6_INSTALL_CMD%"
)

if not "%VM3_IP%"=="" (
    echo Installing k6 on VM3...
    ssh -i "%USERPROFILE%\.ssh\oracle_k6_key" -o StrictHostKeyChecking=no opc@%VM3_IP% "%K6_INSTALL_CMD%"
)

if not "%VM4_IP%"=="" (
    echo Installing k6 on VM4...
    ssh -i "%USERPROFILE%\.ssh\oracle_k6_key" -o StrictHostKeyChecking=no opc@%VM4_IP% "%K6_INSTALL_CMD%"
)

echo.
echo ==========================================
echo   STEP 4: Copy Test Script to VMs
echo ==========================================
echo.

if not "%VM1_IP%"=="" (
    echo Copying script to VM1...
    scp -i "%USERPROFILE%\.ssh\oracle_k6_key" -o StrictHostKeyChecking=no ..\k6-betway-loadtest.js opc@%VM1_IP%:~/loadtest/
)

if not "%VM2_IP%"=="" (
    echo Copying script to VM2...
    scp -i "%USERPROFILE%\.ssh\oracle_k6_key" -o StrictHostKeyChecking=no ..\k6-betway-loadtest.js opc@%VM2_IP%:~/loadtest/
)

if not "%VM3_IP%"=="" (
    echo Copying script to VM3...
    scp -i "%USERPROFILE%\.ssh\oracle_k6_key" -o StrictHostKeyChecking=no ..\k6-betway-loadtest.js opc@%VM3_IP%:~/loadtest/
)

if not "%VM4_IP%"=="" (
    echo Copying script to VM4...
    scp -i "%USERPROFILE%\.ssh\oracle_k6_key" -o StrictHostKeyChecking=no ..\k6-betway-loadtest.js opc@%VM4_IP%:~/loadtest/
)

echo.
echo ==========================================
echo   SETUP COMPLETE!
echo ==========================================
echo.
echo Your VMs are ready for load testing.
echo.
echo To run a quick test on VM1:
echo   ssh -i "%USERPROFILE%\.ssh\oracle_k6_key" opc@%VM1_IP% "cd ~/loadtest && k6 run --vus 100 --duration 1m k6-betway-loadtest.js"
echo.
echo To run the full distributed test, edit and run:
echo   run-distributed-test.ps1
echo.
echo VM IP Addresses configured:
echo   VM1: %VM1_IP%
echo   VM2: %VM2_IP%
echo   VM3: %VM3_IP%
echo   VM4: %VM4_IP%
echo.
pause
