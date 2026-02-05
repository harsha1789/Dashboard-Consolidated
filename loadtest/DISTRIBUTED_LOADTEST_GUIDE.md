# Distributed Load Testing Guide - Multiple IP Addresses

## Overview

This guide explains how to run load tests from multiple IP addresses to simulate real-world traffic patterns for Betway Tanzania.

---

## Option 1: Local Docker (Different Container IPs)

### Quick Start
```bash
cd loadtest

# Start InfluxDB + Grafana + 4 k6 workers
docker-compose -f docker-compose.distributed.yml up -d

# Scale to more workers (each gets different container IP)
docker-compose -f docker-compose.distributed.yml up -d --scale k6-worker=10

# View real-time results
# Open: http://localhost:3030 (Grafana Dashboard)

# Stop all containers
docker-compose -f docker-compose.distributed.yml down
```

### Limitations
- All containers share the same public IP
- Good for testing, but not true multi-IP simulation

---

## Option 2: Cloud VMs - True Multi-IP (Recommended)

Deploy k6 workers across multiple cloud regions for real IP diversity.

### AWS Setup (Free Tier Eligible)

```bash
# 1. Create EC2 instances in different regions
# Regions: us-east-1, us-west-2, eu-west-1, ap-southeast-1

# 2. On each VM, install k6:
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# 3. Copy test script to each VM
scp k6-betway-loadtest.js ubuntu@<VM_IP>:~/

# 4. Run test on each VM (adjust VUs per region)
# VM1 (1000 VUs): k6 run --vus 1000 --duration 5m k6-betway-loadtest.js
# VM2 (1000 VUs): k6 run --vus 1000 --duration 5m k6-betway-loadtest.js
# VM3 (1000 VUs): k6 run --vus 1000 --duration 5m k6-betway-loadtest.js
# VM4 (1000 VUs): k6 run --vus 1000 --duration 5m k6-betway-loadtest.js
```

### GCP Setup (Free Tier)

```bash
# Create VMs in different zones
gcloud compute instances create k6-worker-1 --zone=us-central1-a --machine-type=e2-medium
gcloud compute instances create k6-worker-2 --zone=europe-west1-b --machine-type=e2-medium
gcloud compute instances create k6-worker-3 --zone=asia-east1-a --machine-type=e2-medium
gcloud compute instances create k6-worker-4 --zone=southamerica-east1-a --machine-type=e2-medium

# SSH and install k6 on each
gcloud compute ssh k6-worker-1 --zone=us-central1-a
# Then run k6 install commands
```

### Azure Setup

```bash
# Create VMs in different regions
az vm create --resource-group k6-loadtest --name k6-worker-1 --location eastus --image Ubuntu2204
az vm create --resource-group k6-loadtest --name k6-worker-2 --location westeurope --image Ubuntu2204
az vm create --resource-group k6-loadtest --name k6-worker-3 --location southeastasia --image Ubuntu2204
az vm create --resource-group k6-loadtest --name k6-worker-4 --location brazilsouth --image Ubuntu2204
```

---

## Option 3: k6 Cloud (Easiest - Paid)

k6 Cloud provides instant access to load generators in 21+ global locations.

```bash
# Install k6
# Login to k6 Cloud
k6 login cloud --token YOUR_API_TOKEN

# Run distributed test from multiple locations
k6 cloud k6-betway-loadtest.js

# Or specify locations in script:
# export const options = {
#   ext: {
#     loadimpact: {
#       distribution: {
#         'amazon:us:ashburn': { loadZone: 'amazon:us:ashburn', percent: 25 },
#         'amazon:ie:dublin': { loadZone: 'amazon:ie:dublin', percent: 25 },
#         'amazon:sg:singapore': { loadZone: 'amazon:sg:singapore', percent: 25 },
#         'amazon:au:sydney': { loadZone: 'amazon:au:sydney', percent: 25 },
#       },
#     },
#   },
# };
```

---

## Option 4: Proxy Rotation (Simulate Different IPs)

Use rotating proxies to make requests appear from different IPs.

### Using BrightData/Luminati

```javascript
// Add to k6 script
import http from 'k6/http';

const PROXY_HOST = 'zproxy.lum-superproxy.io';
const PROXY_PORT = 22225;
const PROXY_USER = 'your-username';
const PROXY_PASS = 'your-password';

export default function() {
    const res = http.get('https://mobi.betway.co.tz/', {
        proxy: `http://${PROXY_USER}:${PROXY_PASS}@${PROXY_HOST}:${PROXY_PORT}`,
    });
}
```

### Using Free Proxy List (Less Reliable)

```javascript
const proxies = [
    'http://proxy1.example.com:8080',
    'http://proxy2.example.com:8080',
    'http://proxy3.example.com:8080',
];

export default function() {
    const proxy = proxies[Math.floor(Math.random() * proxies.length)];
    const res = http.get('https://mobi.betway.co.tz/', { proxy });
}
```

---

## Recommended Setup for 4000 Users from Multiple IPs

### Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                     DISTRIBUTED LOAD TEST                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│    ┌──────────────┐     ┌──────────────┐     ┌──────────────┐   │
│    │  AWS US-East │     │  GCP Europe  │     │ Azure Asia   │   │
│    │  1000 VUs    │     │  1000 VUs    │     │  1000 VUs    │   │
│    │  IP: x.x.x.1 │     │  IP: y.y.y.2 │     │  IP: z.z.z.3 │   │
│    └──────┬───────┘     └──────┬───────┘     └──────┬───────┘   │
│           │                    │                    │            │
│           └────────────────────┼────────────────────┘            │
│                                │                                 │
│                                ▼                                 │
│                    ┌───────────────────────┐                    │
│                    │   mobi.betway.co.tz   │                    │
│                    │   Target Website      │                    │
│                    └───────────────────────┘                    │
│                                                                  │
│    ┌──────────────┐                                             │
│    │  Local/AWS   │                                             │
│    │  1000 VUs    │                                             │
│    │  IP: w.w.w.4 │                                             │
│    └──────────────┘                                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Step-by-Step Guide

1. **Create 4 Cloud VMs** (one in each region)
   - AWS US-East: t3.medium
   - GCP Europe: e2-medium
   - Azure Asia: Standard_B2s
   - Your local machine or another VM

2. **Install k6 on each VM**
   ```bash
   curl -s https://dl.k6.io/key.gpg | sudo apt-key add -
   echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
   sudo apt-get update && sudo apt-get install k6
   ```

3. **Copy test script** to each VM

4. **Create orchestration script** (run-distributed.sh):
   ```bash
   #!/bin/bash

   # VM IPs
   VMS=("vm1-ip" "vm2-ip" "vm3-ip" "vm4-ip")
   VUS_PER_VM=1000
   DURATION="5m"

   # Start tests simultaneously
   for vm in "${VMS[@]}"; do
       ssh ubuntu@$vm "k6 run --vus $VUS_PER_VM --duration $DURATION k6-betway-loadtest.js" &
   done

   # Wait for all to complete
   wait
   echo "All load tests completed!"
   ```

5. **Run the test**:
   ```bash
   chmod +x run-distributed.sh
   ./run-distributed.sh
   ```

6. **Collect results** from each VM and aggregate

---

## Centralized Metrics Collection

### Send all metrics to central InfluxDB

On each VM, run:
```bash
k6 run --out influxdb=http://YOUR_CENTRAL_INFLUXDB:8086/k6 k6-betway-loadtest.js
```

### View in Grafana
- Connect Grafana to InfluxDB
- Import k6 dashboard (ID: 2587)
- See real-time metrics from all locations

---

## Cost Estimates

| Option | Cost | IPs | Setup Time |
|--------|------|-----|------------|
| Docker Local | Free | 1 (shared) | 5 mins |
| AWS Free Tier | Free (750 hrs/mo) | 4 | 30 mins |
| GCP Free Tier | Free ($300 credit) | 4 | 30 mins |
| Azure Free Tier | Free ($200 credit) | 4 | 30 mins |
| k6 Cloud | ~$99/mo | 21+ regions | 5 mins |
| Proxy Rotation | ~$50-500/mo | 1000s | 15 mins |

---

## Quick Commands Reference

```bash
# Run locally with 1000 VUs
k6 run --vus 1000 --duration 5m k6-betway-loadtest.js

# Run with custom stages (ramp up/down)
k6 run k6-betway-loadtest.js

# Output to JSON
k6 run --out json=results.json k6-betway-loadtest.js

# Output to InfluxDB
k6 run --out influxdb=http://localhost:8086/k6 k6-betway-loadtest.js

# Run from k6 Cloud
k6 cloud k6-betway-loadtest.js

# Check test without running
k6 inspect k6-betway-loadtest.js
```

---

## Safety Notes

1. **Always get authorization** before load testing any website
2. **Start small** - Begin with 100 VUs and increase gradually
3. **Monitor target** - Watch for error responses and back off if needed
4. **Use rate limiting** - Don't overwhelm the target
5. **Test during off-peak** - Run major tests during low traffic periods
6. **Have a kill switch** - Be ready to stop tests immediately

---

## Troubleshooting

**Issue: Connection refused**
- Check if target is blocking your IP
- Reduce VUs and retry
- Add delays between requests

**Issue: High error rate**
- Target may be rate limiting
- Reduce concurrent users
- Add think time between requests

**Issue: Slow response times**
- Network latency from your location
- Target server is overloaded
- Reduce load and retry

---

*Document Version: 1.0*
*Last Updated: January 2026*
