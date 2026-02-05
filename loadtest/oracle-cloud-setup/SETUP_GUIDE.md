# Oracle Cloud Free Tier - Distributed Load Testing Setup

## Step 1: Create Oracle Cloud Account (5 minutes)

### 1.1 Sign Up
1. Go to: **https://www.oracle.com/cloud/free/**
2. Click **"Start for free"**
3. Fill in your details:
   - Email address
   - Country (select your country)
   - First/Last name

### 1.2 Verify Email
- Check your inbox for verification email
- Click the verification link

### 1.3 Complete Registration
- Set a password (must include uppercase, lowercase, number, special char)
- Choose **Home Region** (select one closest to you):
  - US East (Ashburn) - recommended for US
  - UK South (London) - recommended for Europe
  - Germany Central (Frankfurt)
  - India West (Mumbai)
  - Japan East (Tokyo)

### 1.4 Phone Verification
- Enter phone number
- Receive and enter verification code

### 1.5 Payment Verification (Don't worry - won't be charged!)
- Oracle requires a card for verification only
- **Always Free resources will NEVER be charged**
- You can use a virtual card or prepaid card if concerned

### 1.6 Account Created!
- You'll receive confirmation email
- Login to: **https://cloud.oracle.com**

---

## Step 2: Create Virtual Cloud Network (VCN) - 3 minutes

### 2.1 Open Networking
1. Login to Oracle Cloud Console
2. Click hamburger menu (☰) → **Networking** → **Virtual Cloud Networks**

### 2.2 Create VCN
1. Click **"Start VCN Wizard"**
2. Select **"Create VCN with Internet Connectivity"**
3. Click **"Start VCN Wizard"**

### 2.3 Configure VCN
- **VCN Name:** `k6-loadtest-vcn`
- **Compartment:** (keep default)
- **VCN CIDR Block:** `10.0.0.0/16`
- **Public Subnet CIDR:** `10.0.0.0/24`
- **Private Subnet CIDR:** `10.0.1.0/24`

4. Click **"Next"** then **"Create"**
5. Wait for completion, click **"View VCN"**

### 2.4 Open Firewall Ports
1. In VCN details, click **"Public Subnet-k6-loadtest-vcn"**
2. Click the **Security List** (Default Security List...)
3. Click **"Add Ingress Rules"**
4. Add these rules:

| Source CIDR | Protocol | Dest Port | Description |
|-------------|----------|-----------|-------------|
| 0.0.0.0/0 | TCP | 22 | SSH Access |
| 0.0.0.0/0 | TCP | 3000 | Grafana (optional) |
| 0.0.0.0/0 | TCP | 8086 | InfluxDB (optional) |

5. Click **"Add Ingress Rules"**

---

## Step 3: Create SSH Key Pair (2 minutes)

### Windows (PowerShell):
```powershell
# Open PowerShell and run:
ssh-keygen -t rsa -b 4096 -f $HOME\.ssh\oracle_k6_key

# View public key (copy this for VM creation):
Get-Content $HOME\.ssh\oracle_k6_key.pub
```

### Or use PuTTYgen:
1. Download PuTTY: https://www.putty.org/
2. Open PuTTYgen
3. Click "Generate" and move mouse randomly
4. Save private key as `oracle_k6_key.ppk`
5. Copy the public key text from the window

---

## Step 4: Create VM Instances (10 minutes)

### 4.1 Navigate to Compute
1. Click hamburger menu (☰) → **Compute** → **Instances**
2. Click **"Create Instance"**

### 4.2 Create First VM (k6-worker-1)

**Name and Placement:**
- **Name:** `k6-worker-1`
- **Compartment:** (keep default)
- **Availability Domain:** AD-1

**Image and Shape:**
1. Click **"Edit"** in Image and Shape section
2. Click **"Change Image"**
3. Select **"Oracle Linux 8"** (or Ubuntu 22.04)
4. Click **"Change Shape"**
5. Select **"Ampere"** (ARM processor)
6. Select **"VM.Standard.A1.Flex"**
7. Set:
   - **OCPUs:** 1
   - **Memory:** 6 GB
8. Click **"Select Shape"**

**Networking:**
- **VCN:** Select `k6-loadtest-vcn`
- **Subnet:** Select Public Subnet
- **Public IPv4 Address:** Assign a public IPv4 address ✓

**SSH Keys:**
1. Select **"Paste public keys"**
2. Paste your public key from Step 3

**Boot Volume:**
- Keep defaults (46.6 GB)

3. Click **"Create"**

### 4.3 Wait for VM to be Running
- Status will change from "Provisioning" to "Running"
- Note the **Public IP Address** shown

### 4.4 Create 3 More VMs
Repeat Step 4.2 for:
- `k6-worker-2` (AD-2 if available)
- `k6-worker-3` (AD-3 if available)
- `k6-worker-4`

**Note:** Always Free tier allows up to:
- 4 ARM VMs (A1.Flex) with total 24 GB RAM and 4 OCPUs
- OR 2 AMD VMs (E2.1.Micro) with 1 GB RAM each

---

## Step 5: Record Your VM Details

Fill in your VM details:

| VM Name | Public IP | Region/AD |
|---------|-----------|-----------|
| k6-worker-1 | ___.___.___.___  | |
| k6-worker-2 | ___.___.___.___  | |
| k6-worker-3 | ___.___.___.___  | |
| k6-worker-4 | ___.___.___.___  | |

---

## Step 6: Connect and Setup VMs (15 minutes)

### 6.1 Connect via SSH

**Windows (PowerShell):**
```powershell
ssh -i $HOME\.ssh\oracle_k6_key opc@<VM_PUBLIC_IP>
```

**Windows (PuTTY):**
1. Open PuTTY
2. Host Name: `<VM_PUBLIC_IP>`
3. Port: 22
4. Connection → SSH → Auth → Browse for private key (.ppk)
5. Click "Open"
6. Login as: `opc`

### 6.2 Install k6 on Each VM

Run these commands on each VM:

```bash
# Update system
sudo dnf update -y

# Install k6
sudo dnf install -y https://dl.k6.io/rpm/repo.rpm
sudo dnf install -y k6

# Verify installation
k6 version

# Create test directory
mkdir -p ~/loadtest
```

### 6.3 Copy Test Script to Each VM

From your local machine (PowerShell):
```powershell
# Copy to each VM
scp -i $HOME\.ssh\oracle_k6_key C:\Users\HT67091\Downloads\Automation-Dashboard-main\loadtest\k6-betway-loadtest.js opc@<VM1_IP>:~/loadtest/
scp -i $HOME\.ssh\oracle_k6_key C:\Users\HT67091\Downloads\Automation-Dashboard-main\loadtest\k6-betway-loadtest.js opc@<VM2_IP>:~/loadtest/
scp -i $HOME\.ssh\oracle_k6_key C:\Users\HT67091\Downloads\Automation-Dashboard-main\loadtest\k6-betway-loadtest.js opc@<VM3_IP>:~/loadtest/
scp -i $HOME\.ssh\oracle_k6_key C:\Users\HT67091\Downloads\Automation-Dashboard-main\loadtest\k6-betway-loadtest.js opc@<VM4_IP>:~/loadtest/
```

---

## Step 7: Run Distributed Load Test

### Option A: Run Manually on Each VM

SSH into each VM and run:

```bash
# VM1 - 1000 VUs
cd ~/loadtest
k6 run --vus 1000 --duration 5m k6-betway-loadtest.js

# VM2 - 1000 VUs
cd ~/loadtest
k6 run --vus 1000 --duration 5m k6-betway-loadtest.js

# VM3 - 1000 VUs
cd ~/loadtest
k6 run --vus 1000 --duration 5m k6-betway-loadtest.js

# VM4 - 1000 VUs
cd ~/loadtest
k6 run --vus 1000 --duration 5m k6-betway-loadtest.js
```

### Option B: Use Orchestration Script (Recommended)

See `run-distributed-test.ps1` script in this folder.

---

## Step 8: View Results

Each VM will output results like:

```
     ✓ Homepage - status is 200-399
     ✓ Homepage - response time < 3s

     checks.........................: 95.00% ✓ 19000  ✗ 1000
     data_received..................: 125 MB 417 kB/s
     data_sent......................: 12 MB  40 kB/s
     http_req_duration..............: avg=487ms  min=89ms  max=5.2s  p(95)=2.1s
     http_reqs......................: 50000  166/s
     vus............................: 1000   min=1000 max=1000
```

---

## Troubleshooting

### Can't SSH to VM?
- Check Security List has port 22 open
- Verify you're using correct private key
- Use username `opc` (not root)

### k6 installation fails?
```bash
# Alternative installation
curl -s https://dl.k6.io/key.gpg | sudo gpg --dearmor -o /usr/share/keyrings/k6-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### VM won't create (quota exceeded)?
- Always Free allows 4 A1.Flex OCPUs total
- Reduce OCPU count per VM (use 1 OCPU each)
- Or use 2 AMD E2.1.Micro VMs instead

---

## Cost Summary

| Resource | Quantity | Cost |
|----------|----------|------|
| VM.Standard.A1.Flex | 4 instances | $0 |
| Block Storage | 200 GB total | $0 |
| Network Bandwidth | 10 TB/month | $0 |
| Public IPs | 4 | $0 |
| **TOTAL** | | **$0/month** |

---

## Clean Up (Optional)

To delete resources after testing:
1. Compute → Instances → Terminate each VM
2. Networking → VCNs → Delete VCN

This ensures no accidental charges if you ever upgrade from free tier.

---

*Guide Version: 1.0*
*Last Updated: January 2026*
