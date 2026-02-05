# ============================================
# Distributed Load Test Orchestrator
# Runs k6 tests on multiple Oracle Cloud VMs
# ============================================

param(
    [int]$VUsPerVM = 1000,
    [string]$Duration = "5m",
    [switch]$QuickTest,
    [switch]$SetupOnly,
    [switch]$CollectResults
)

# ============================================
# CONFIGURATION - UPDATE THESE WITH YOUR VM IPs
# ============================================
$VMs = @(
    @{ Name = "k6-worker-1"; IP = "YOUR_VM1_IP_HERE"; Region = "Region1" },
    @{ Name = "k6-worker-2"; IP = "YOUR_VM2_IP_HERE"; Region = "Region2" },
    @{ Name = "k6-worker-3"; IP = "YOUR_VM3_IP_HERE"; Region = "Region3" },
    @{ Name = "k6-worker-4"; IP = "YOUR_VM4_IP_HERE"; Region = "Region4" }
)

$SSHKeyPath = "$HOME\.ssh\oracle_k6_key"
$SSHUser = "opc"
$TestScript = "k6-betway-loadtest.js"
$LocalScriptPath = "..\k6-betway-loadtest.js"

# ============================================
# FUNCTIONS
# ============================================

function Write-Header {
    param([string]$Text)
    Write-Host ""
    Write-Host "=" * 60 -ForegroundColor Cyan
    Write-Host "  $Text" -ForegroundColor White
    Write-Host "=" * 60 -ForegroundColor Cyan
    Write-Host ""
}

function Write-Step {
    param([string]$Text)
    Write-Host "[*] $Text" -ForegroundColor Yellow
}

function Write-Success {
    param([string]$Text)
    Write-Host "[✓] $Text" -ForegroundColor Green
}

function Write-Error {
    param([string]$Text)
    Write-Host "[✗] $Text" -ForegroundColor Red
}

function Test-SSHConnection {
    param([string]$IP)
    try {
        $result = ssh -i $SSHKeyPath -o ConnectTimeout=5 -o StrictHostKeyChecking=no "$SSHUser@$IP" "echo 'connected'" 2>&1
        return $result -eq "connected"
    } catch {
        return $false
    }
}

function Install-K6OnVM {
    param([string]$IP, [string]$Name)
    Write-Step "Installing k6 on $Name ($IP)..."

    $installCmd = @"
sudo dnf install -y https://dl.k6.io/rpm/repo.rpm 2>/dev/null || true
sudo dnf install -y k6 2>/dev/null || sudo yum install -y k6 2>/dev/null
mkdir -p ~/loadtest
k6 version
"@

    ssh -i $SSHKeyPath -o StrictHostKeyChecking=no "$SSHUser@$IP" $installCmd

    if ($LASTEXITCODE -eq 0) {
        Write-Success "k6 installed on $Name"
    } else {
        Write-Error "Failed to install k6 on $Name"
    }
}

function Copy-TestScript {
    param([string]$IP, [string]$Name)
    Write-Step "Copying test script to $Name ($IP)..."

    scp -i $SSHKeyPath -o StrictHostKeyChecking=no $LocalScriptPath "${SSHUser}@${IP}:~/loadtest/$TestScript"

    if ($LASTEXITCODE -eq 0) {
        Write-Success "Script copied to $Name"
    } else {
        Write-Error "Failed to copy script to $Name"
    }
}

function Start-LoadTestOnVM {
    param(
        [string]$IP,
        [string]$Name,
        [int]$VUs,
        [string]$TestDuration
    )

    Write-Step "Starting load test on $Name ($IP) with $VUs VUs..."

    # Run test in background with nohup
    $testCmd = "cd ~/loadtest && nohup k6 run --vus $VUs --duration $TestDuration $TestScript > k6-output.log 2>&1 &"

    ssh -i $SSHKeyPath -o StrictHostKeyChecking=no "$SSHUser@$IP" $testCmd

    Write-Success "Test started on $Name"
}

function Get-TestStatus {
    param([string]$IP, [string]$Name)

    $statusCmd = "ps aux | grep k6 | grep -v grep | wc -l"
    $result = ssh -i $SSHKeyPath -o StrictHostKeyChecking=no "$SSHUser@$IP" $statusCmd

    return [int]$result -gt 0
}

function Get-TestResults {
    param([string]$IP, [string]$Name)

    Write-Step "Collecting results from $Name ($IP)..."

    $resultsCmd = "cat ~/loadtest/k6-output.log 2>/dev/null | tail -50"
    $results = ssh -i $SSHKeyPath -o StrictHostKeyChecking=no "$SSHUser@$IP" $resultsCmd

    return $results
}

# ============================================
# MAIN EXECUTION
# ============================================

Write-Header "DISTRIBUTED LOAD TEST - ORACLE CLOUD"

# Check if IPs are configured
$unconfiguredVMs = $VMs | Where-Object { $_.IP -like "*YOUR_VM*" -or $_.IP -eq "" }
if ($unconfiguredVMs.Count -gt 0) {
    Write-Error "Please update the VM IP addresses in this script!"
    Write-Host ""
    Write-Host "Edit this file and replace 'YOUR_VM1_IP_HERE', etc. with your actual VM IPs" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# Quick test mode
if ($QuickTest) {
    $VUsPerVM = 100
    $Duration = "1m"
    Write-Host "Quick test mode: $VUsPerVM VUs per VM, $Duration duration" -ForegroundColor Yellow
}

# Display configuration
Write-Host "Configuration:" -ForegroundColor Cyan
Write-Host "  VMs: $($VMs.Count)"
Write-Host "  VUs per VM: $VUsPerVM"
Write-Host "  Total VUs: $($VMs.Count * $VUsPerVM)"
Write-Host "  Duration: $Duration"
Write-Host ""

# Step 1: Test SSH connectivity
Write-Header "STEP 1: Testing SSH Connectivity"

$connectedVMs = @()
foreach ($vm in $VMs) {
    Write-Step "Testing connection to $($vm.Name) ($($vm.IP))..."
    if (Test-SSHConnection -IP $vm.IP) {
        Write-Success "Connected to $($vm.Name)"
        $connectedVMs += $vm
    } else {
        Write-Error "Cannot connect to $($vm.Name)"
    }
}

if ($connectedVMs.Count -eq 0) {
    Write-Error "No VMs are reachable. Please check your SSH key and VM IPs."
    exit 1
}

Write-Host ""
Write-Host "Connected VMs: $($connectedVMs.Count) / $($VMs.Count)" -ForegroundColor Cyan

# Step 2: Setup VMs (if requested or needed)
if ($SetupOnly -or (-not $CollectResults)) {
    Write-Header "STEP 2: Setting Up VMs"

    foreach ($vm in $connectedVMs) {
        Install-K6OnVM -IP $vm.IP -Name $vm.Name
        Copy-TestScript -IP $vm.IP -Name $vm.Name
    }
}

if ($SetupOnly) {
    Write-Success "Setup complete! Run again without -SetupOnly to start the test."
    exit 0
}

# Step 3: Start load tests
if (-not $CollectResults) {
    Write-Header "STEP 3: Starting Distributed Load Test"

    $startTime = Get-Date
    Write-Host "Start Time: $startTime" -ForegroundColor Cyan
    Write-Host ""

    # Start tests on all VMs simultaneously
    $jobs = @()
    foreach ($vm in $connectedVMs) {
        $jobs += Start-Job -ScriptBlock {
            param($IP, $Name, $VUs, $Duration, $SSHKeyPath, $SSHUser, $TestScript)
            $testCmd = "cd ~/loadtest && k6 run --vus $VUs --duration $Duration $TestScript 2>&1"
            ssh -i $SSHKeyPath -o StrictHostKeyChecking=no "$SSHUser@$IP" $testCmd
        } -ArgumentList $vm.IP, $vm.Name, $VUsPerVM, $Duration, $SSHKeyPath, $SSHUser, $TestScript

        Write-Success "Test started on $($vm.Name) ($($vm.IP))"
    }

    Write-Host ""
    Write-Host "All tests started! Waiting for completion..." -ForegroundColor Yellow
    Write-Host "This will take approximately $Duration" -ForegroundColor Yellow
    Write-Host ""

    # Wait for all jobs with progress
    $totalSeconds = switch -Regex ($Duration) {
        '(\d+)s' { [int]$Matches[1] }
        '(\d+)m' { [int]$Matches[1] * 60 }
        '(\d+)h' { [int]$Matches[1] * 3600 }
        default { 300 }
    }

    $elapsed = 0
    while (($jobs | Where-Object { $_.State -eq 'Running' }).Count -gt 0 -and $elapsed -lt ($totalSeconds + 60)) {
        $running = ($jobs | Where-Object { $_.State -eq 'Running' }).Count
        $completed = ($jobs | Where-Object { $_.State -eq 'Completed' }).Count
        $percent = [math]::Min(100, [math]::Round(($elapsed / $totalSeconds) * 100))

        Write-Progress -Activity "Running Distributed Load Test" `
            -Status "$running VMs running, $completed completed - $percent%" `
            -PercentComplete $percent

        Start-Sleep -Seconds 5
        $elapsed += 5
    }

    Write-Progress -Activity "Running Distributed Load Test" -Completed
}

# Step 4: Collect and display results
Write-Header "STEP 4: Collecting Results"

$allResults = @()
foreach ($vm in $connectedVMs) {
    Write-Host ""
    Write-Host "=" * 50 -ForegroundColor Magenta
    Write-Host "Results from $($vm.Name) ($($vm.IP)):" -ForegroundColor Magenta
    Write-Host "=" * 50 -ForegroundColor Magenta

    $results = Get-TestResults -IP $vm.IP -Name $vm.Name
    Write-Host $results

    $allResults += @{
        VM = $vm.Name
        IP = $vm.IP
        Results = $results
    }
}

# Summary
Write-Header "TEST SUMMARY"

$endTime = Get-Date
Write-Host "Test Completed!" -ForegroundColor Green
Write-Host ""
Write-Host "  Start Time: $startTime"
Write-Host "  End Time: $endTime"
Write-Host "  Duration: $((New-TimeSpan -Start $startTime -End $endTime).ToString())"
Write-Host ""
Write-Host "  VMs Used: $($connectedVMs.Count)"
Write-Host "  VUs per VM: $VUsPerVM"
Write-Host "  Total VUs: $($connectedVMs.Count * $VUsPerVM)"
Write-Host ""
Write-Host "  Source IPs:"
foreach ($vm in $connectedVMs) {
    Write-Host "    - $($vm.Name): $($vm.IP)"
}

Write-Host ""
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "  DISTRIBUTED LOAD TEST COMPLETE" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Cyan
