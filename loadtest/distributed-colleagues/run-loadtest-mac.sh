#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

clear

echo ""
echo -e "${CYAN}============================================================${NC}"
echo -e "${CYAN}        BETWAY TANZANIA - DISTRIBUTED LOAD TEST${NC}"
echo -e "${CYAN}============================================================${NC}"
echo ""

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo -e "${RED}[ERROR] k6 is not installed!${NC}"
    echo ""
    echo "Please install k6 first:"
    echo ""
    echo "  MAC (using Homebrew):"
    echo "    brew install k6"
    echo ""
    echo "  LINUX (Ubuntu/Debian):"
    echo "    sudo gpg -k"
    echo "    sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \\"
    echo "      --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69"
    echo "    echo 'deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main' \\"
    echo "      | sudo tee /etc/apt/sources.list.d/k6.list"
    echo "    sudo apt-get update && sudo apt-get install k6"
    echo ""
    echo "  LINUX (using snap):"
    echo "    sudo snap install k6"
    echo ""
    exit 1
fi

echo -e "${GREEN}[OK] k6 is installed${NC}"
k6 version
echo ""

# Show IP address
echo "Your IP Address (what the server will see):"
curl -s https://api.ipify.org 2>/dev/null || echo "Could not detect IP"
echo ""
echo ""

echo -e "${CYAN}============================================================${NC}"
echo "  CONFIGURATION"
echo -e "${CYAN}============================================================${NC}"
echo "  Target:     https://mobi.betway.co.tz"
echo "  Your VUs:   1000 virtual users"
echo "  Duration:   ~5 minutes"
echo -e "${CYAN}============================================================${NC}"
echo ""

# Countdown
echo -e "${YELLOW}The test will start in 10 seconds...${NC}"
echo "Press Ctrl+C to cancel."
echo ""

for i in {10..1}; do
    echo "Starting in $i..."
    sleep 1
done

echo ""
echo -e "${CYAN}============================================================${NC}"
echo -e "${CYAN}   STARTING LOAD TEST - DO NOT CLOSE THIS WINDOW!${NC}"
echo -e "${CYAN}============================================================${NC}"
echo ""

# Run the test
k6 run betway-loadtest.js

echo ""
echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}   TEST COMPLETED!${NC}"
echo -e "${GREEN}============================================================${NC}"
echo ""
echo "Please take a screenshot of the results above"
echo "and send it to the test coordinator."
echo ""
read -p "Press Enter to exit..."
