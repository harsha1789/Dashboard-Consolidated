# OWASP ZAP Integration Setup Guide

This guide explains how to set up OWASP ZAP for use with the Automation Dashboard's DAST (Dynamic Application Security Testing) functionality.

## Prerequisites

- OWASP ZAP installed on your system
- Node.js server running on port 3000

## Installation

### Windows

1. Download OWASP ZAP from: https://www.zaproxy.org/download/
2. Run the installer (ZAP_WEEKLY or ZAP_RELEASE)
3. Default installation path: `C:\Program Files\OWASP\Zed Attack Proxy`

### macOS

```bash
brew install --cask owasp-zap
```

### Linux (Debian/Ubuntu)

```bash
# Download the latest release
wget https://github.com/zaproxy/zaproxy/releases/download/v2.14.0/ZAP_2_14_0_unix.sh
chmod +x ZAP_2_14_0_unix.sh
./ZAP_2_14_0_unix.sh
```

### Docker

```bash
docker pull ghcr.io/zaproxy/zaproxy:stable
docker run -u zap -p 8080:8080 ghcr.io/zaproxy/zaproxy:stable zap.sh -daemon -host 0.0.0.0 -port 8080 -config api.disablekey=true -config api.addrs.addr.name=.* -config api.addrs.addr.regex=true
```

## Starting ZAP in Daemon Mode

For the dashboard integration to work, ZAP must be running in daemon (headless) mode with the API enabled.

### Basic Start (No API Key - Development Only)

```bash
# Windows
"C:\Program Files\OWASP\Zed Attack Proxy\zap.bat" -daemon -port 8080 -config api.disablekey=true

# macOS/Linux
zap.sh -daemon -port 8080 -config api.disablekey=true
```

### Secure Start (With API Key - Recommended for Production)

```bash
# Windows
"C:\Program Files\OWASP\Zed Attack Proxy\zap.bat" -daemon -port 8080 -config api.key=your-secure-api-key

# macOS/Linux
zap.sh -daemon -port 8080 -config api.key=your-secure-api-key
```

Then set the environment variable for the dashboard server:
```bash
export ZAP_API_KEY=your-secure-api-key
```

## Configuration Options

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ZAP_HOST` | `localhost` | ZAP server hostname |
| `ZAP_PORT` | `8080` | ZAP API port |
| `ZAP_API_KEY` | (empty) | API key for authentication |

### ZAP Command Line Options

| Option | Description |
|--------|-------------|
| `-daemon` | Run in headless mode |
| `-port <port>` | Set API port (default: 8080) |
| `-host <host>` | Set listening host (default: localhost) |
| `-config api.disablekey=true` | Disable API key requirement |
| `-config api.key=<key>` | Set API key |
| `-config api.addrs.addr.name=.*` | Allow connections from any IP |
| `-config api.addrs.addr.regex=true` | Use regex for IP matching |

## Verifying ZAP is Running

### Check via Browser

Open: http://localhost:8080/JSON/core/view/version/

You should see:
```json
{"version":"2.14.0"}
```

### Check via cURL

```bash
curl http://localhost:8080/JSON/core/view/version/
```

### Check via Dashboard

1. Navigate to Security Testing > DAST
2. Look for the green "OWASP ZAP Connected" indicator at the top

## Scan Types

### Quick Scan
- Uses ZAP's "Light" scan policy
- Faster but less comprehensive
- Good for CI/CD pipelines

### Full Scan
- Complete spider + active scan
- Most thorough
- Can take 30+ minutes for large sites

### API Only
- Skips the crawling phase
- Direct active scan
- Use when you know the exact endpoints

## Troubleshooting

### "ZAP not connected" Error

1. Verify ZAP is running:
   ```bash
   curl http://localhost:8080/JSON/core/view/version/
   ```

2. Check if port 8080 is available:
   ```bash
   # Windows
   netstat -an | findstr 8080

   # macOS/Linux
   lsof -i :8080
   ```

3. Ensure API is enabled (not blocked by firewall)

### Scan Hangs or Times Out

- Large websites may take longer to scan
- Consider using "Quick Scan" for faster results
- Check ZAP memory allocation if scanning large sites

### No Findings Detected

- Ensure the target URL is accessible
- Check if the site has CSRF tokens blocking ZAP
- Try adding authentication if the site requires login

## Security Considerations

1. **Never scan production systems without authorization**
2. Use API keys in production environments
3. Run ZAP on a secure, isolated network
4. Review ZAP's proxy settings to avoid data leaks
5. Keep ZAP updated for latest vulnerability checks

## API Endpoints Reference

The dashboard uses these ZAP API endpoints:

| Endpoint | Description |
|----------|-------------|
| `/JSON/core/view/version/` | Get ZAP version |
| `/JSON/core/action/accessUrl/` | Access a URL |
| `/JSON/spider/action/scan/` | Start spider crawl |
| `/JSON/spider/view/status/` | Get spider progress |
| `/JSON/ascan/action/scan/` | Start active scan |
| `/JSON/ascan/view/status/` | Get active scan progress |
| `/JSON/core/view/alerts/` | Get security findings |
| `/JSON/core/view/alertsSummary/` | Get finding counts |

## Further Resources

- [OWASP ZAP Official Docs](https://www.zaproxy.org/docs/)
- [ZAP API Documentation](https://www.zaproxy.org/docs/api/)
- [ZAP Docker Documentation](https://www.zaproxy.org/docs/docker/)
- [ZAP Automation Framework](https://www.zaproxy.org/docs/automate/)
