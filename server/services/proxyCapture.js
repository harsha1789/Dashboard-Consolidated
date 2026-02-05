/**
 * Built-in Proxy Capture Service
 * Captures browser traffic for game API analysis.
 * Uses a simple HTTP CONNECT proxy that logs API requests.
 */

const http = require('http');
const https = require('https');
const net = require('net');
const { URL } = require('url');

const STATIC_EXTENSIONS = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.map', '.mp3', '.mp4', '.webp', '.avif'];

class ProxyCapture {
    constructor(io) {
        this.io = io;
        this.server = null;
        this.port = 8888;
        this.capturedApis = [];
        this.running = false;
        this.startTime = null;
    }

    isApiCall(url) {
        const lower = url.toLowerCase();
        if (STATIC_EXTENSIONS.some(ext => lower.includes(ext))) return false;
        if (/\.(html?|htm)$/i.test(lower)) return false;
        // Keep API-like URLs
        if (/\/api\//i.test(lower)) return true;
        if (/\/v[0-9]+\//i.test(lower)) return true;
        if (/\.json/i.test(lower)) return true;
        if (/graphql/i.test(lower)) return true;
        if (/\/ps\?/i.test(lower)) return true; // Habanero game server
        if (/\/game/i.test(lower)) return true;
        return false;
    }

    start(port) {
        if (this.running) return { success: false, error: 'Proxy already running' };

        this.port = port || 8888;
        this.capturedApis = [];
        this.startTime = new Date().toISOString();

        this.server = http.createServer((req, res) => {
            // Forward HTTP requests
            const targetUrl = req.url;
            if (!targetUrl.startsWith('http')) {
                res.writeHead(400);
                res.end('Bad request');
                return;
            }

            try {
                const parsed = new URL(targetUrl);
                const isApi = this.isApiCall(targetUrl);

                const proxyOptions = {
                    hostname: parsed.hostname,
                    port: parsed.port || 80,
                    path: parsed.pathname + parsed.search,
                    method: req.method,
                    headers: { ...req.headers, host: parsed.host }
                };

                const startTime = Date.now();
                let requestBody = '';

                req.on('data', chunk => { requestBody += chunk; });
                req.on('end', () => {
                    const proxyReq = http.request(proxyOptions, proxyRes => {
                        let responseBody = '';
                        proxyRes.on('data', chunk => { responseBody += chunk; });
                        proxyRes.on('end', () => {
                            const responseTime = Date.now() - startTime;

                            if (isApi) {
                                this._captureRequest({
                                    method: req.method,
                                    url: targetUrl,
                                    hostname: parsed.hostname,
                                    path: parsed.pathname + parsed.search,
                                    headers: req.headers,
                                    body: requestBody || null,
                                    status: proxyRes.statusCode,
                                    responseTime,
                                    responsePreview: responseBody.substring(0, 500),
                                    timestamp: new Date().toISOString()
                                });
                            }
                        });

                        res.writeHead(proxyRes.statusCode, proxyRes.headers);
                        proxyRes.pipe(res);
                    });

                    proxyReq.on('error', () => {
                        res.writeHead(502);
                        res.end('Bad gateway');
                    });

                    if (requestBody) proxyReq.write(requestBody);
                    proxyReq.end();
                });
            } catch (e) {
                res.writeHead(500);
                res.end('Proxy error');
            }
        });

        // Handle HTTPS CONNECT tunneling
        this.server.on('connect', (req, clientSocket, head) => {
            const [hostname, port] = req.url.split(':');
            const serverSocket = net.connect(parseInt(port) || 443, hostname, () => {
                clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
                serverSocket.write(head);
                serverSocket.pipe(clientSocket);
                clientSocket.pipe(serverSocket);
            });

            serverSocket.on('error', () => {
                clientSocket.end();
            });

            clientSocket.on('error', () => {
                serverSocket.end();
            });
        });

        return new Promise((resolve, reject) => {
            this.server.listen(this.port, '0.0.0.0', () => {
                this.running = true;
                console.log(`[Proxy] Capture proxy started on port ${this.port}`);
                if (this.io) {
                    this.io.emit('proxy:started', { port: this.port });
                }
                resolve({ success: true, port: this.port });
            });

            this.server.on('error', (err) => {
                this.running = false;
                reject(new Error(`Failed to start proxy: ${err.message}`));
            });
        });
    }

    _captureRequest(entry) {
        // Deduplicate by method + path
        const key = `${entry.method}:${entry.path.split('?')[0]}`;
        const existing = this.capturedApis.find(a => `${a.method}:${(a.path || '').split('?')[0]}` === key);

        if (!existing) {
            this.capturedApis.push(entry);
            console.log(`[Proxy] Captured: ${entry.method} ${entry.url} [${entry.status}] ${entry.responseTime}ms`);

            if (this.io) {
                this.io.emit('proxy:api-captured', {
                    method: entry.method,
                    url: entry.url,
                    status: entry.status,
                    responseTime: entry.responseTime,
                    total: this.capturedApis.length
                });
            }
        }
    }

    stop() {
        if (!this.running || !this.server) {
            return { success: false, error: 'Proxy not running' };
        }

        this.server.close();
        this.running = false;
        console.log(`[Proxy] Stopped. Captured ${this.capturedApis.length} API calls.`);

        if (this.io) {
            this.io.emit('proxy:stopped', { total: this.capturedApis.length });
        }

        // Convert captured data to API format compatible with the dashboard
        const apis = this.capturedApis.map((entry, i) => {
            let parsedUrl;
            try { parsedUrl = new URL(entry.url); } catch (e) { return null; }

            return {
                id: i + 1,
                method: entry.method,
                endpoint: parsedUrl.pathname,
                fullUrl: entry.url,
                category: 'Captured',
                description: `${entry.method} ${parsedUrl.pathname}`,
                status: entry.status,
                responseTime: entry.responseTime,
                headers: entry.headers,
                body: entry.body ? tryParseJSON(entry.body) : null,
                source: 'proxy'
            };
        }).filter(Boolean);

        return { success: true, apis, total: apis.length };
    }

    getStatus() {
        return {
            running: this.running,
            port: this.port,
            capturedCount: this.capturedApis.length,
            startTime: this.startTime
        };
    }

    getCapturedApis() {
        return this.capturedApis;
    }
}

function tryParseJSON(str) {
    try { return JSON.parse(str); } catch (e) { return str; }
}

module.exports = ProxyCapture;
