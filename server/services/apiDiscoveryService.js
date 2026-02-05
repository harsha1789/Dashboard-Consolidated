/**
 * API Discovery Service
 * Uses Playwright to crawl websites and discover API endpoints
 */

const { chromium } = require('playwright');
const { URL } = require('url');

class APIDiscoveryService {
    constructor(io) {
        this.io = io;
        this.discoveredAPIs = new Map(); // Use Map to avoid duplicates
        this.capturedRequests = [];
        this.scanProgress = 0;
        this.scanPhase = '';
        this.logs = [];
    }

    // Emit progress to client
    emitProgress(progress, phase, log = null) {
        this.scanProgress = progress;
        this.scanPhase = phase;
        if (log) {
            this.logs.push({ message: log, type: 'info', timestamp: new Date().toISOString() });
        }
        if (this.io) {
            this.io.emit('discovery-progress', {
                progress: this.scanProgress,
                phase: this.scanPhase,
                logs: this.logs
            });
        }
    }

    emitLog(message, type = 'info') {
        this.logs.push({ message, type, timestamp: new Date().toISOString() });
        if (this.io) {
            this.io.emit('discovery-log', { message, type, timestamp: new Date().toISOString() });
        }
        console.log(`[${type.toUpperCase()}] ${message}`);
    }

    /**
     * Main discovery function
     */
    async discoverAPIs(targetUrl, options = {}) {
        const {
            timeout = 60000,
            scrollPage = true,
            clickButtons = true,
            maxAPIs = 200,
            waitTime = 3000
        } = options;

        this.discoveredAPIs.clear();
        this.capturedRequests = [];
        this.logs = [];

        let browser = null;

        try {
            // Phase 1: Initializing
            this.emitProgress(5, 'Initializing', `Starting API discovery for ${targetUrl}`);

            browser = await chromium.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-web-security',
                    '--disable-features=IsolateOrigins,site-per-process'
                ]
            });

            const context = await browser.newContext({
                viewport: { width: 1920, height: 1080 },
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                ignoreHTTPSErrors: true
            });

            const page = await context.newPage();

            // Phase 2: Setting up network interception
            this.emitProgress(10, 'Setting up network interception', 'Configuring request interceptor');

            // Intercept all network requests
            page.on('request', (request) => {
                this.captureRequest(request, targetUrl);
            });

            page.on('response', async (response) => {
                await this.captureResponse(response, targetUrl);
            });

            // Phase 3: Navigating to target
            this.emitProgress(20, 'Navigating to target', `Loading ${targetUrl}`);

            await page.goto(targetUrl, {
                waitUntil: 'networkidle',
                timeout: timeout
            });

            this.emitLog(`Page loaded: ${await page.title()}`, 'success');

            // Phase 4: Capturing initial requests
            this.emitProgress(35, 'Capturing initial requests', `Captured ${this.capturedRequests.length} requests so far`);

            // Wait for dynamic content
            await page.waitForTimeout(waitTime);

            // Phase 5: Scrolling page
            if (scrollPage) {
                this.emitProgress(45, 'Scrolling page', 'Triggering lazy-loaded content');
                await this.autoScroll(page);
                await page.waitForTimeout(2000);
            }

            this.emitLog(`After scroll: ${this.capturedRequests.length} requests captured`, 'success');

            // Phase 6: Interacting with elements
            if (clickButtons) {
                this.emitProgress(60, 'Interacting with elements', 'Clicking buttons and links');
                await this.interactWithPage(page, targetUrl);
                await page.waitForTimeout(2000);
            }

            this.emitLog(`After interaction: ${this.capturedRequests.length} requests captured`, 'success');

            // Phase 7: Checking for OpenAPI/Swagger specs
            this.emitProgress(75, 'Checking for API specs', 'Looking for OpenAPI/Swagger documentation');
            await this.checkForOpenAPISpec(page, targetUrl);

            // Phase 8: Classifying endpoints
            this.emitProgress(85, 'Classifying endpoints', 'Analyzing and categorizing discovered APIs');
            const classifiedAPIs = this.classifyAPIs();

            // Phase 9: Finalizing
            this.emitProgress(95, 'Finalizing', `Discovered ${classifiedAPIs.length} unique API endpoints`);

            await browser.close();

            this.emitProgress(100, 'Complete', 'API discovery completed successfully');
            this.emitLog(`Discovery complete: ${classifiedAPIs.length} APIs found`, 'success');

            return {
                success: true,
                targetUrl,
                totalRequests: this.capturedRequests.length,
                apis: classifiedAPIs.slice(0, maxAPIs),
                logs: this.logs
            };

        } catch (error) {
            this.emitLog(`Error during discovery: ${error.message}`, 'error');
            console.error('API Discovery Error:', error);

            if (browser) {
                await browser.close();
            }

            return {
                success: false,
                error: error.message,
                apis: this.classifyAPIs(),
                logs: this.logs
            };
        }
    }

    /**
     * Capture outgoing requests
     */
    captureRequest(request, targetUrl) {
        try {
            const url = request.url();
            const method = request.method();
            const resourceType = request.resourceType();

            // Filter for potential API calls
            if (this.isAPICall(url, resourceType)) {
                const apiData = {
                    url,
                    method,
                    resourceType,
                    headers: request.headers(),
                    postData: request.postData(),
                    timestamp: Date.now()
                };

                this.capturedRequests.push(apiData);

                // Add to discovered APIs
                const endpoint = this.extractEndpoint(url, targetUrl);
                const key = `${method}:${endpoint}`;

                if (!this.discoveredAPIs.has(key)) {
                    this.discoveredAPIs.set(key, {
                        method,
                        endpoint,
                        fullUrl: url,
                        params: this.extractParams(url),
                        headers: this.sanitizeHeaders(request.headers()),
                        body: this.parseBody(request.postData()),
                        count: 1
                    });
                } else {
                    const existing = this.discoveredAPIs.get(key);
                    existing.count++;
                }
            }
        } catch (e) {
            // Silently ignore request capture errors
        }
    }

    /**
     * Capture response data
     */
    async captureResponse(response, targetUrl) {
        try {
            const url = response.url();
            const status = response.status();
            const method = response.request().method();

            if (this.isAPICall(url, 'fetch')) {
                const endpoint = this.extractEndpoint(url, targetUrl);
                const key = `${method}:${endpoint}`;

                if (this.discoveredAPIs.has(key)) {
                    const api = this.discoveredAPIs.get(key);
                    api.status = status;
                    api.contentType = response.headers()['content-type'];

                    // Try to get response body for content type detection
                    try {
                        const body = await response.text();
                        if (body.startsWith('{') || body.startsWith('[')) {
                            api.responseType = 'json';
                        }
                    } catch (e) {
                        // Ignore body read errors
                    }
                }
            }
        } catch (e) {
            // Silently ignore response capture errors
        }
    }

    /**
     * Check if URL is an API call
     */
    isAPICall(url, resourceType) {
        // Skip static resources with file extensions
        const staticExtensions = [
            '.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico',
            '.woff', '.woff2', '.ttf', '.eot', '.map', '.webp', '.mp4', '.mp3',
            '.pdf', '.zip', '.tar', '.gz'
        ];

        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname.toLowerCase();

            // Check file extension
            if (staticExtensions.some(ext => pathname.endsWith(ext))) {
                return false;
            }
        } catch (e) {
            // If URL parsing fails, continue checking
        }

        // Skip common non-API patterns (analytics, tracking, ads)
        const skipPatterns = [
            /google-analytics/i,
            /googletagmanager/i,
            /facebook\.com\/tr/i,
            /twitter\.com\/i\/jot/i,
            /analytics\./i,
            /tracking\./i,
            /pixel\./i,
            /beacon\./i,
            /hotjar/i,
            /clarity\.ms/i,
            /doubleclick/i,
            /adsense/i,
            /adserver/i,
            /pubads/i,
            /googlesyndication/i,
            /cloudflare.*challenge/i,
            /recaptcha/i,
            /hcaptcha/i
        ];
        if (skipPatterns.some(pattern => pattern.test(url))) {
            return false;
        }

        // Always capture XHR and Fetch requests - this is the key!
        if (resourceType === 'xhr' || resourceType === 'fetch') {
            return true;
        }

        // Include API patterns - expanded list
        const apiPatterns = [
            /\/api\//i,
            /\/api$/i,
            /\/v[0-9]+\//i,
            /\/rest\//i,
            /\/graphql/i,
            /\/query/i,
            /\/mutation/i,
            /\.json(\?|$)/i,
            /\/ajax\//i,
            /\/rpc\//i,
            /\/service/i,
            /\/services\//i,
            /\/data\//i,
            /\/auth/i,
            /\/login/i,
            /\/logout/i,
            /\/register/i,
            /\/signup/i,
            /\/signin/i,
            /\/user/i,
            /\/users/i,
            /\/account/i,
            /\/session/i,
            /\/token/i,
            /\/oauth/i,
            /\/sso/i,
            // Betting specific
            /\/bet/i,
            /\/bets/i,
            /\/sport/i,
            /\/sports/i,
            /\/event/i,
            /\/events/i,
            /\/match/i,
            /\/matches/i,
            /\/game/i,
            /\/games/i,
            /\/odd/i,
            /\/odds/i,
            /\/market/i,
            /\/markets/i,
            /\/fixture/i,
            /\/fixtures/i,
            /\/live/i,
            /\/inplay/i,
            /\/in-play/i,
            /\/prematch/i,
            /\/pre-match/i,
            /\/cashout/i,
            /\/cash-out/i,
            /\/wallet/i,
            /\/balance/i,
            /\/deposit/i,
            /\/withdraw/i,
            /\/transaction/i,
            /\/transactions/i,
            /\/payment/i,
            /\/payments/i,
            /\/bonus/i,
            /\/bonuses/i,
            /\/promo/i,
            /\/promotions/i,
            /\/coupon/i,
            /\/ticket/i,
            /\/slip/i,
            /\/betslip/i,
            /\/stake/i,
            /\/wager/i,
            /\/league/i,
            /\/leagues/i,
            /\/competition/i,
            /\/tournament/i,
            /\/team/i,
            /\/teams/i,
            /\/player/i,
            /\/players/i,
            /\/score/i,
            /\/scores/i,
            /\/result/i,
            /\/results/i,
            /\/statistic/i,
            /\/statistics/i,
            /\/stat/i,
            /\/stats/i,
            /\/feed/i,
            /\/stream/i,
            /\/config/i,
            /\/settings/i,
            /\/preferences/i,
            /\/notification/i,
            /\/notifications/i,
            /\/message/i,
            /\/messages/i,
            /\/search/i,
            /\/find/i,
            /\/lookup/i,
            /\/casino/i,
            /\/virtual/i,
            /\/jackpot/i,
            /\/history/i
        ];

        // Check URL patterns
        return apiPatterns.some(pattern => pattern.test(url));
    }

    /**
     * Extract endpoint path from full URL
     */
    extractEndpoint(url, baseUrl) {
        try {
            const parsed = new URL(url);
            const base = new URL(baseUrl);

            // Get pathname and remove query string
            let endpoint = parsed.pathname;

            // Replace dynamic IDs with placeholders
            endpoint = endpoint
                .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:uuid')
                .replace(/\/[0-9]+/g, '/:id')
                .replace(/\/[a-f0-9]{24}/gi, '/:mongoId');

            return endpoint;
        } catch (e) {
            return url;
        }
    }

    /**
     * Extract query parameters
     */
    extractParams(url) {
        try {
            const parsed = new URL(url);
            const params = [];

            parsed.searchParams.forEach((value, key) => {
                params.push({
                    name: key,
                    type: this.inferType(value),
                    value: value.length > 50 ? value.substring(0, 50) + '...' : value,
                    required: false
                });
            });

            return params;
        } catch (e) {
            return [];
        }
    }

    /**
     * Infer parameter type from value
     */
    inferType(value) {
        if (value === 'true' || value === 'false') return 'boolean';
        if (!isNaN(value) && value.trim() !== '') return 'number';
        if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'date';
        if (/^[\w.-]+@[\w.-]+\.\w+$/.test(value)) return 'email';
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) return 'uuid';
        return 'string';
    }

    /**
     * Sanitize headers (remove sensitive data)
     */
    sanitizeHeaders(headers) {
        const sanitized = {};
        const sensitiveKeys = ['cookie', 'authorization', 'x-api-key', 'x-auth-token', 'set-cookie'];

        for (const [key, value] of Object.entries(headers)) {
            if (sensitiveKeys.includes(key.toLowerCase())) {
                sanitized[key] = '[REDACTED]';
            } else {
                sanitized[key] = value;
            }
        }

        return sanitized;
    }

    /**
     * Parse request body
     */
    parseBody(postData) {
        if (!postData) return null;

        try {
            return JSON.parse(postData);
        } catch (e) {
            return postData;
        }
    }

    /**
     * Auto-scroll the page - more aggressive scrolling
     */
    async autoScroll(page) {
        // Multiple scroll passes to ensure all lazy content loads
        for (let pass = 0; pass < 3; pass++) {
            await page.evaluate(async (passNum) => {
                await new Promise((resolve) => {
                    let totalHeight = 0;
                    const distance = 400;
                    const maxScroll = 15000;

                    const timer = setInterval(() => {
                        const scrollHeight = document.body.scrollHeight;
                        window.scrollBy(0, distance);
                        totalHeight += distance;

                        if (totalHeight >= scrollHeight || totalHeight > maxScroll) {
                            clearInterval(timer);
                            // Scroll back to top on last pass
                            if (passNum === 2) {
                                window.scrollTo(0, 0);
                            }
                            resolve();
                        }
                    }, 150);
                });
            }, pass);

            // Wait between scroll passes for content to load
            await page.waitForTimeout(1500);
        }

        // Trigger scroll events multiple times
        await page.evaluate(() => {
            for (let i = 0; i < 5; i++) {
                window.dispatchEvent(new Event('scroll'));
            }
        });
    }

    /**
     * Interact with page elements - more comprehensive
     */
    async interactWithPage(page, targetUrl) {
        const baseHost = new URL(targetUrl).host;
        const visitedUrls = new Set([page.url()]);

        try {
            // Common betting site navigation paths to explore
            const commonPaths = [
                '/sports', '/sport', '/live', '/inplay', '/in-play',
                '/casino', '/prematch', '/pre-match', '/virtuals',
                '/promotions', '/promos', '/bonuses', '/jackpot',
                '/results', '/statistics', '/account', '/my-bets',
                '/betslip', '/history', '/transactions'
            ];

            // Try to navigate to common pages
            for (const path of commonPaths) {
                try {
                    const navUrl = new URL(path, targetUrl).href;
                    if (!visitedUrls.has(navUrl)) {
                        this.emitLog(`Exploring: ${path}`, 'info');
                        await page.goto(navUrl, { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
                        visitedUrls.add(navUrl);
                        await page.waitForTimeout(2000);

                        // Scroll this page too
                        await this.quickScroll(page);
                    }
                } catch (e) {
                    // Path doesn't exist, continue
                }
            }

            // Go back to main page
            await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
            await page.waitForTimeout(1000);

            // Click on tab elements, sport categories, menu items
            const clickableSelectors = [
                // Navigation and menus
                'nav a', '.nav a', '.menu a', '.navigation a',
                '[class*="nav"] a', '[class*="menu"] a',
                // Tabs
                '[role="tab"]', '.tab', '[class*="tab"]',
                // Sport categories (common in betting sites)
                '[class*="sport"]', '[class*="category"]', '[class*="league"]',
                '[data-sport]', '[data-category]',
                // Expandable sections
                '[class*="accordion"]', '[class*="collapse"]', '[class*="expand"]',
                // Dropdown triggers
                '[class*="dropdown"]', '.dropdown-toggle',
                // List items that might be clickable
                '[class*="list"] li', '[class*="item"]'
            ];

            for (const selector of clickableSelectors) {
                try {
                    const elements = await page.$$(selector);
                    const visibleElements = [];

                    for (const el of elements.slice(0, 8)) {
                        try {
                            if (await el.isVisible()) {
                                visibleElements.push(el);
                            }
                        } catch (e) {}
                    }

                    for (const el of visibleElements.slice(0, 5)) {
                        try {
                            await el.click({ timeout: 1500 }).catch(() => {});
                            await page.waitForTimeout(800);
                        } catch (e) {}
                    }
                } catch (e) {}
            }

            // Click navigation links (same domain only)
            const links = await page.$$('a[href]');

            for (const link of links.slice(0, 20)) {
                try {
                    const href = await link.getAttribute('href');
                    if (href && !href.startsWith('javascript:') && !href.startsWith('#') && !href.startsWith('mailto:')) {
                        const linkUrl = new URL(href, targetUrl);
                        if (linkUrl.host === baseHost && !visitedUrls.has(linkUrl.href)) {
                            const isVisible = await link.isVisible().catch(() => false);
                            if (isVisible) {
                                await link.click({ timeout: 2000 }).catch(() => {});
                                visitedUrls.add(linkUrl.href);
                                await page.waitForTimeout(1000);

                                // Quick scroll on new page
                                await this.quickScroll(page);
                            }
                        }
                    }
                } catch (e) {}
            }

            // Click buttons that might trigger API calls
            const buttons = await page.$$('button, [role="button"], input[type="button"], input[type="submit"], [class*="btn"]');
            for (const button of buttons.slice(0, 15)) {
                try {
                    const isVisible = await button.isVisible().catch(() => false);
                    const text = await button.textContent().catch(() => '');

                    // Skip buttons that might cause issues
                    if (text && (text.toLowerCase().includes('logout') || text.toLowerCase().includes('delete'))) {
                        continue;
                    }

                    if (isVisible) {
                        await button.click({ timeout: 1500 }).catch(() => {});
                        await page.waitForTimeout(500);
                    }
                } catch (e) {}
            }

            // Hover over elements that might load content on hover
            const hoverElements = await page.$$('[class*="hover"], [class*="tooltip"], [class*="dropdown"]');
            for (const el of hoverElements.slice(0, 10)) {
                try {
                    await el.hover({ timeout: 1000 }).catch(() => {});
                    await page.waitForTimeout(300);
                } catch (e) {}
            }

            // Trigger common events
            await page.evaluate(() => {
                window.dispatchEvent(new Event('scroll'));
                window.dispatchEvent(new Event('resize'));
                window.dispatchEvent(new Event('load'));
                document.dispatchEvent(new Event('DOMContentLoaded'));
            });

        } catch (e) {
            this.emitLog(`Interaction error: ${e.message}`, 'warning');
        }
    }

    /**
     * Quick scroll for sub-pages
     */
    async quickScroll(page) {
        await page.evaluate(async () => {
            await new Promise((resolve) => {
                let totalHeight = 0;
                const distance = 500;
                const timer = setInterval(() => {
                    window.scrollBy(0, distance);
                    totalHeight += distance;
                    if (totalHeight >= document.body.scrollHeight || totalHeight > 5000) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 100);
            });
        });
    }

    /**
     * Check for OpenAPI/Swagger specs
     */
    async checkForOpenAPISpec(page, targetUrl) {
        const specPaths = [
            '/swagger.json',
            '/openapi.json',
            '/api/swagger.json',
            '/api/openapi.json',
            '/v1/swagger.json',
            '/v2/swagger.json',
            '/api-docs',
            '/api/docs',
            '/swagger/v1/swagger.json'
        ];

        for (const specPath of specPaths) {
            try {
                const specUrl = new URL(specPath, targetUrl).href;
                const response = await page.request.get(specUrl, { timeout: 5000 });

                if (response.ok()) {
                    const data = await response.json();

                    if (data.paths || data.openapi || data.swagger) {
                        this.emitLog(`Found OpenAPI spec at ${specPath}`, 'success');
                        this.parseOpenAPISpec(data, targetUrl);
                        return;
                    }
                }
            } catch (e) {
                // Spec not found at this path
            }
        }
    }

    /**
     * Parse OpenAPI specification
     */
    parseOpenAPISpec(spec, targetUrl) {
        try {
            const basePath = spec.basePath || '';
            const paths = spec.paths || {};

            for (const [path, methods] of Object.entries(paths)) {
                for (const [method, details] of Object.entries(methods)) {
                    if (['get', 'post', 'put', 'delete', 'patch'].includes(method.toLowerCase())) {
                        const endpoint = basePath + path;
                        const key = `${method.toUpperCase()}:${endpoint}`;

                        if (!this.discoveredAPIs.has(key)) {
                            this.discoveredAPIs.set(key, {
                                method: method.toUpperCase(),
                                endpoint,
                                fullUrl: new URL(endpoint, targetUrl).href,
                                params: this.extractOpenAPIParams(details.parameters || []),
                                description: details.summary || details.description || '',
                                tags: details.tags || [],
                                source: 'openapi'
                            });
                        }
                    }
                }
            }

            this.emitLog(`Parsed ${Object.keys(paths).length} paths from OpenAPI spec`, 'success');
        } catch (e) {
            this.emitLog(`Error parsing OpenAPI spec: ${e.message}`, 'warning');
        }
    }

    /**
     * Extract parameters from OpenAPI spec
     */
    extractOpenAPIParams(parameters) {
        return parameters.map(param => ({
            name: param.name,
            type: param.type || param.schema?.type || 'string',
            required: param.required || false,
            in: param.in,
            description: param.description || ''
        }));
    }

    /**
     * Classify and organize discovered APIs
     */
    classifyAPIs() {
        const apis = [];
        let id = 1;

        for (const [key, api] of this.discoveredAPIs) {
            const category = this.categorizeEndpoint(api.endpoint);
            const auth = this.detectAuth(api.headers);

            apis.push({
                id: id++,
                method: api.method,
                endpoint: api.endpoint,
                fullUrl: api.fullUrl,
                category,
                auth,
                params: api.params || [],
                headers: api.headers || {},
                body: api.body,
                description: api.description || this.generateDescription(api.method, api.endpoint),
                status: api.status,
                responseType: api.responseType,
                source: api.source || 'network',
                count: api.count || 1
            });
        }

        // Sort by category and endpoint
        apis.sort((a, b) => {
            if (a.category !== b.category) {
                return a.category.localeCompare(b.category);
            }
            return a.endpoint.localeCompare(b.endpoint);
        });

        return apis;
    }

    /**
     * Categorize endpoint based on path patterns
     */
    categorizeEndpoint(endpoint) {
        const lower = endpoint.toLowerCase();

        // Authentication
        if (/\/(auth|login|logout|register|session|token|oauth|sso|password|otp|verify|mfa)/i.test(lower)) {
            return 'Authentication';
        }
        // User/Account
        if (/\/(user|account|profile|settings|preferences)/i.test(lower)) {
            return 'User & Account';
        }
        // Betting - Live
        if (/\/(live|inplay|in-play)/i.test(lower)) {
            return 'Live & Play';
        }
        // Betting - Pre-match
        if (/\/(prematch|pre-match|upcoming|fixture)/i.test(lower)) {
            return 'Pre-Match';
        }
        // Betting - Markets/Odds
        if (/\/(market|odd|price|line)/i.test(lower)) {
            return 'Markets & Odds';
        }
        // Betting - Bet placement
        if (/\/(bet|wager|stake|slip|ticket|coupon)/i.test(lower)) {
            return 'Betslip & Betting';
        }
        // Betting - Cashout
        if (/\/(cashout|cash-out|payout)/i.test(lower)) {
            return 'Cashout';
        }
        // Sports/Events
        if (/\/(sport|event|match|game|competition|league|tournament)/i.test(lower)) {
            return 'Sports & Events';
        }
        // Transactions
        if (/\/(transaction|history|statement)/i.test(lower)) {
            return 'Transaction History';
        }
        // Payments/Wallet
        if (/\/(payment|deposit|withdraw|wallet|balance|fund)/i.test(lower)) {
            return 'Wallet & Payments';
        }
        // Promotions
        if (/\/(promo|bonus|offer|reward|campaign)/i.test(lower)) {
            return 'Promotions';
        }
        // Content
        if (/\/(content|page|cms|banner|carousel)/i.test(lower)) {
            return 'Content';
        }
        // Configuration
        if (/\/(config|setting|option|preference|locale|language|currency)/i.test(lower)) {
            return 'Configuration';
        }
        // Search
        if (/\/(search|find|query|lookup)/i.test(lower)) {
            return 'Search';
        }
        // System
        if (/\/(health|status|ping|version|info)/i.test(lower)) {
            return 'System';
        }

        return 'General';
    }

    /**
     * Detect authentication method from headers
     */
    detectAuth(headers) {
        if (!headers) return 'Unknown';

        const authHeader = headers['authorization'] || headers['Authorization'];

        if (authHeader) {
            if (authHeader === '[REDACTED]') return 'Bearer Token';
            if (authHeader.startsWith('Bearer')) return 'Bearer Token';
            if (authHeader.startsWith('Basic')) return 'Basic Auth';
            return 'Custom Auth';
        }

        if (headers['x-api-key'] || headers['X-API-Key']) return 'API Key';
        if (headers['x-auth-token'] || headers['X-Auth-Token']) return 'Auth Token';

        return 'None';
    }

    /**
     * Generate description for endpoint
     */
    generateDescription(method, endpoint) {
        const action = {
            'GET': 'Retrieve',
            'POST': 'Create/Submit',
            'PUT': 'Update',
            'PATCH': 'Partially update',
            'DELETE': 'Delete'
        }[method] || 'Access';

        // Extract meaningful parts from endpoint
        const parts = endpoint.split('/').filter(p => p && !p.startsWith(':'));
        const resource = parts[parts.length - 1] || 'resource';

        return `${action} ${resource.replace(/[-_]/g, ' ')}`;
    }
}

module.exports = APIDiscoveryService;
