============================================================
        BETWAY LOAD TEST - DISTRIBUTED TESTING KIT
============================================================

Hi Team!

We're running a distributed load test on Betway Tanzania.
Each person running this script = 1 unique IP address.

With 4 people running 1000 VUs each = 4000 users from 4 IPs!

============================================================
QUICK START (Takes 2 minutes)
============================================================

STEP 1: Install k6 (one-time setup)
--------------------------------------------------------------
WINDOWS:
  - Download: https://dl.k6.io/msi/k6-latest-amd64.msi
  - Run the installer, click Next > Next > Finish

MAC:
  - Open Terminal and run: brew install k6

LINUX:
  - Run: sudo snap install k6

STEP 2: Run the test
--------------------------------------------------------------
WINDOWS:
  - Double-click: run-loadtest-windows.bat
  - Or open CMD and run: k6 run betway-loadtest.js

MAC/LINUX:
  - Open Terminal
  - Navigate to this folder: cd path/to/this/folder
  - Run: chmod +x run-loadtest-mac.sh && ./run-loadtest-mac.sh
  - Or: k6 run betway-loadtest.js

============================================================
COORDINATION - START AT SAME TIME!
============================================================

We'll all start at the agreed time:

  START TIME: _______________  (coordinator fills this in)

  Example: "January 22, 2026 at 3:00 PM EAT"

Count down together on a call, or use: https://time.is

============================================================
TEST CONFIGURATION
============================================================

  Target:     https://mobi.betway.co.tz
  Your VUs:   1000 virtual users
  Duration:   5 minutes
  Your Role:  1 of 4 load generators

============================================================
WHAT TO SEND BACK
============================================================

After the test completes, please send back:
  1. Screenshot of the final results
  2. Or copy-paste the summary output

Look for these metrics:
  - http_reqs (total requests)
  - http_req_duration (response times)
  - http_req_failed (error rate)

============================================================
TROUBLESHOOTING
============================================================

"k6 is not recognized":
  - Make sure k6 is installed (Step 1)
  - Windows: Restart your terminal after installing

"Connection refused":
  - Check your internet connection
  - The target website might be blocking; reduce VUs

"High error rate":
  - Normal under heavy load
  - This is what we're testing!

Questions? Contact: [Your contact info here]

============================================================
