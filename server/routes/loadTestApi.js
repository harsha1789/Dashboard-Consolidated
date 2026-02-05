/**
 * Load Testing API Routes
 * Handles API discovery and load testing operations
 */

const express = require('express');
const APIDiscoveryService = require('../services/apiDiscoveryService');
const k6Service = require('../services/k6Service');
const loadTestDb = require('../config/loadTestDb');
const loadTestConfigsDb = require('../config/loadTestConfigsDb');
const { analyzeGameTraffic, validateApi, generateK6Script } = require('../services/aiLoadTestAnalyzer');
const ProxyCapture = require('../services/proxyCapture');

function createLoadTestRouter(io) {
    const router = express.Router();

    // Store active discovery sessions
    const activeSessions = new Map();

    // Proxy capture instance
    const proxyCapture = new ProxyCapture(io);

    /**
     * POST /api/loadtest/discover
     * Start API discovery for a target URL
     */
    router.post('/discover', async (req, res) => {
        const { targetUrl, options = {} } = req.body;

        if (!targetUrl) {
            return res.status(400).json({
                success: false,
                error: 'Target URL is required'
            });
        }

        // Validate URL
        try {
            new URL(targetUrl);
        } catch (e) {
            return res.status(400).json({
                success: false,
                error: 'Invalid URL format'
            });
        }

        // Create session ID
        const sessionId = Date.now().toString();

        try {
            console.log(`[LoadTest] Starting API discovery for: ${targetUrl}`);

            // Create discovery service
            const discoveryService = new APIDiscoveryService(io);
            activeSessions.set(sessionId, discoveryService);

            // Start discovery (async)
            const result = await discoveryService.discoverAPIs(targetUrl, {
                timeout: options.timeout || 60000,
                scrollPage: options.scrollPage !== false,
                clickButtons: options.clickButtons !== false,
                maxAPIs: options.maxAPIs || 200,
                waitTime: options.waitTime || 3000
            });

            // Clean up session
            activeSessions.delete(sessionId);

            console.log(`[LoadTest] Discovery complete: ${result.apis?.length || 0} APIs found`);

            res.json({
                success: true,
                sessionId,
                ...result
            });

        } catch (error) {
            console.error('[LoadTest] Discovery error:', error);
            activeSessions.delete(sessionId);

            res.status(500).json({
                success: false,
                error: error.message,
                sessionId
            });
        }
    });

    /**
     * POST /api/loadtest/discover/quick
     * Quick discovery - shorter timeout, less interaction
     */
    router.post('/discover/quick', async (req, res) => {
        const { targetUrl } = req.body;

        if (!targetUrl) {
            return res.status(400).json({
                success: false,
                error: 'Target URL is required'
            });
        }

        try {
            new URL(targetUrl);
        } catch (e) {
            return res.status(400).json({
                success: false,
                error: 'Invalid URL format'
            });
        }

        try {
            console.log(`[LoadTest] Quick discovery for: ${targetUrl}`);

            const discoveryService = new APIDiscoveryService(io);

            const result = await discoveryService.discoverAPIs(targetUrl, {
                timeout: 30000,
                scrollPage: true,
                clickButtons: false,
                maxAPIs: 100,
                waitTime: 2000
            });

            res.json({
                success: true,
                ...result
            });

        } catch (error) {
            console.error('[LoadTest] Quick discovery error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/loadtest/discover/status/:sessionId
     * Get discovery status for a session
     */
    router.get('/discover/status/:sessionId', (req, res) => {
        const { sessionId } = req.params;
        const session = activeSessions.get(sessionId);

        if (!session) {
            return res.json({
                success: true,
                status: 'completed',
                message: 'Session not found or already completed'
            });
        }

        res.json({
            success: true,
            status: 'running',
            progress: session.scanProgress,
            phase: session.scanPhase,
            logs: session.logs
        });
    });

    /**
     * POST /api/loadtest/discover/cancel/:sessionId
     * Cancel an active discovery session
     */
    router.post('/discover/cancel/:sessionId', (req, res) => {
        const { sessionId } = req.params;

        if (activeSessions.has(sessionId)) {
            activeSessions.delete(sessionId);
            res.json({
                success: true,
                message: 'Discovery session cancelled'
            });
        } else {
            res.json({
                success: false,
                message: 'Session not found'
            });
        }
    });

    /**
     * POST /api/loadtest/parse/har
     * Parse HAR file to extract APIs
     */
    router.post('/parse/har', express.json({ limit: '50mb' }), (req, res) => {
        const { harContent } = req.body;

        if (!harContent) {
            return res.status(400).json({
                success: false,
                error: 'HAR content is required'
            });
        }

        try {
            const har = typeof harContent === 'string' ? JSON.parse(harContent) : harContent;
            const apis = parseHARFile(har);

            res.json({
                success: true,
                apis,
                totalEntries: har.log?.entries?.length || 0
            });

        } catch (error) {
            res.status(400).json({
                success: false,
                error: 'Invalid HAR format: ' + error.message
            });
        }
    });

    /**
     * POST /api/loadtest/parse/openapi
     * Parse OpenAPI/Swagger spec to extract APIs
     */
    router.post('/parse/openapi', (req, res) => {
        const { specUrl, specContent } = req.body;

        if (!specUrl && !specContent) {
            return res.status(400).json({
                success: false,
                error: 'OpenAPI spec URL or content is required'
            });
        }

        try {
            const spec = typeof specContent === 'string' ? JSON.parse(specContent) : specContent;
            const apis = parseOpenAPISpec(spec);

            res.json({
                success: true,
                apis,
                info: spec.info || {}
            });

        } catch (error) {
            res.status(400).json({
                success: false,
                error: 'Invalid OpenAPI spec: ' + error.message
            });
        }
    });

    /**
     * GET /api/loadtest/health
     * Health check endpoint
     */
    router.get('/health', (req, res) => {
        res.json({
            success: true,
            service: 'load-test-api',
            status: 'healthy',
            activeSessions: activeSessions.size,
            timestamp: new Date().toISOString()
        });
    });

    // ==============================
    // k6 Execution Endpoints
    // ==============================

    /**
     * GET /api/loadtest/k6/status
     * Check if k6 is installed on the system
     */
    router.get('/k6/status', (req, res) => {
        const status = k6Service.checkK6Installed();
        res.json({ success: true, ...status });
    });

    /**
     * POST /api/loadtest/execute
     * Start a k6 load test
     */
    router.post('/execute', (req, res) => {
        const { selectedApis, loadConfig, customHeaders, targetUrl } = req.body;

        if (!selectedApis || selectedApis.length === 0) {
            return res.status(400).json({ success: false, error: 'No APIs selected' });
        }
        if (!targetUrl) {
            return res.status(400).json({ success: false, error: 'Target URL is required' });
        }

        const k6Status = k6Service.checkK6Installed();
        if (!k6Status.available) {
            return res.status(400).json({
                success: false,
                error: 'k6 is not installed. Install it from https://k6.io or use mock mode.',
                k6Available: false
            });
        }

        const testId = `lt-${Date.now()}`;

        try {
            console.log(`[LoadTest] Starting k6 test ${testId} for ${targetUrl} with ${selectedApis.length} APIs`);
            const result = k6Service.startTest(testId, { selectedApis, loadConfig, customHeaders, targetUrl }, io);
            res.json({ success: true, testId, ...result });
        } catch (error) {
            console.error('[LoadTest] Execute error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/loadtest/execute/status/:testId
     * Poll the status of a running test
     */
    router.get('/execute/status/:testId', (req, res) => {
        const { testId } = req.params;
        const status = k6Service.getTestStatus(testId);
        res.json({ success: true, ...status });
    });

    /**
     * POST /api/loadtest/execute/stop/:testId
     * Stop a running test
     */
    router.post('/execute/stop/:testId', (req, res) => {
        const { testId } = req.params;
        console.log(`[LoadTest] Stopping test ${testId}`);
        const result = k6Service.stopTest(testId, io);
        res.json({ success: true, ...result });
    });

    /**
     * GET /api/loadtest/results/:testId
     * Get completed test results
     */
    router.get('/results/:testId', (req, res) => {
        const { testId } = req.params;
        const entry = loadTestDb.getTestById(testId);
        if (!entry) {
            return res.status(404).json({ success: false, error: 'Test not found' });
        }
        res.json({ success: true, ...entry });
    });

    /**
     * GET /api/loadtest/history
     * Get past test runs
     */
    router.get('/history', (req, res) => {
        const limit = parseInt(req.query.limit) || 50;
        const tests = loadTestDb.getTestHistory(limit);
        res.json({ success: true, tests });
    });

    // ==============================
    // Saved Config Endpoints
    // ==============================

    /**
     * POST /api/loadtest/configs
     * Save a new load test configuration
     */
    router.post('/configs', (req, res) => {
        const { name, targetUrl, selectedApis, loadConfig, customHeaders } = req.body;
        try {
            const config = loadTestConfigsDb.addConfig({ name, targetUrl, selectedApis, loadConfig, customHeaders });
            res.json({ success: true, config });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/loadtest/configs
     * List all saved configs for the active client
     */
    router.get('/configs', (req, res) => {
        const limit = parseInt(req.query.limit) || 50;
        const configs = loadTestConfigsDb.getAllConfigs(limit);
        res.json({ success: true, configs });
    });

    /**
     * GET /api/loadtest/configs/:configId
     * Get a single saved config
     */
    router.get('/configs/:configId', (req, res) => {
        const config = loadTestConfigsDb.getConfigById(req.params.configId);
        if (!config) {
            return res.status(404).json({ success: false, error: 'Config not found' });
        }
        res.json({ success: true, config });
    });

    /**
     * PUT /api/loadtest/configs/:configId
     * Update a saved config
     */
    router.put('/configs/:configId', (req, res) => {
        const updated = loadTestConfigsDb.updateConfig(req.params.configId, req.body);
        if (!updated) {
            return res.status(404).json({ success: false, error: 'Config not found' });
        }
        res.json({ success: true, config: updated });
    });

    /**
     * DELETE /api/loadtest/configs/:configId
     * Delete a saved config
     */
    router.delete('/configs/:configId', (req, res) => {
        const deleted = loadTestConfigsDb.deleteConfig(req.params.configId);
        if (!deleted) {
            return res.status(404).json({ success: false, error: 'Config not found' });
        }
        res.json({ success: true });
    });

    // ==============================
    // API Validation & AI Analysis
    // ==============================

    /**
     * POST /api/loadtest/validate
     * Make real HTTP requests to validate APIs are reachable
     */
    router.post('/validate', async (req, res) => {
        const { apis, customHeaders } = req.body;
        if (!apis || !Array.isArray(apis) || apis.length === 0) {
            return res.status(400).json({ success: false, error: 'No APIs provided' });
        }
        try {
            const results = await Promise.all(
                apis.map(api => validateApi(api, customHeaders))
            );
            const passed = results.filter(r => r.success).length;
            res.json({
                success: true,
                results,
                summary: { total: results.length, passed, failed: results.length - passed }
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/loadtest/analyze
     * AI-powered analysis of captured game traffic
     */
    router.post('/analyze', async (req, res) => {
        const { gameUrl, capturedApis, providerHint } = req.body;
        if (!capturedApis || capturedApis.length === 0) {
            return res.status(400).json({ success: false, error: 'No captured APIs provided' });
        }
        try {
            const analysis = await analyzeGameTraffic(gameUrl || '', capturedApis, providerHint);
            res.json({ success: true, analysis });
        } catch (error) {
            console.error('[LoadTest] Analysis error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/loadtest/generate-k6
     * Generate K6 script from a saved config
     */
    router.post('/generate-k6', (req, res) => {
        const { configId } = req.body;
        let config = req.body;

        if (configId) {
            config = loadTestConfigsDb.getConfigById(configId);
            if (!config) {
                return res.status(404).json({ success: false, error: 'Config not found' });
            }
        }

        try {
            const script = generateK6Script(config);
            res.json({ success: true, script, name: config.name || 'load_test' });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ==============================
    // Proxy Capture Endpoints
    // ==============================

    /**
     * POST /api/loadtest/proxy/start
     * Start the capture proxy
     */
    router.post('/proxy/start', async (req, res) => {
        const { port } = req.body;
        try {
            const result = await proxyCapture.start(port || 8888);
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/loadtest/proxy/stop
     * Stop the capture proxy and return captured APIs
     */
    router.post('/proxy/stop', (req, res) => {
        const result = proxyCapture.stop();
        res.json(result);
    });

    /**
     * GET /api/loadtest/proxy/status
     * Check proxy status
     */
    router.get('/proxy/status', (req, res) => {
        const status = proxyCapture.getStatus();
        res.json({ success: true, ...status });
    });

    return router;
}

/**
 * Parse HAR file content
 */
function parseHARFile(har) {
    const apis = [];
    const seen = new Set();
    let id = 1;

    const entries = har.log?.entries || [];

    for (const entry of entries) {
        const request = entry.request;
        const response = entry.response;

        if (!request || !request.url) continue;

        // Filter for API calls
        if (!isAPICall(request.url, request.method)) continue;

        try {
            const url = new URL(request.url);
            const endpoint = normalizeEndpoint(url.pathname);
            const key = `${request.method}:${endpoint}`;

            if (seen.has(key)) continue;
            seen.add(key);

            apis.push({
                id: id++,
                method: request.method,
                endpoint,
                fullUrl: request.url,
                category: categorizeEndpoint(endpoint),
                auth: detectAuthFromHeaders(request.headers),
                params: extractParamsFromURL(request.url),
                headers: sanitizeHeaders(request.headers),
                body: parseRequestBody(request.postData),
                status: response?.status,
                description: `${request.method} ${endpoint}`,
                source: 'har'
            });

        } catch (e) {
            // Skip invalid entries
        }
    }

    return apis;
}

/**
 * Parse OpenAPI/Swagger spec
 */
function parseOpenAPISpec(spec) {
    const apis = [];
    let id = 1;

    const basePath = spec.basePath || '';
    const paths = spec.paths || {};

    for (const [path, methods] of Object.entries(paths)) {
        for (const [method, details] of Object.entries(methods)) {
            if (!['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(method.toLowerCase())) {
                continue;
            }

            const endpoint = basePath + path;

            apis.push({
                id: id++,
                method: method.toUpperCase(),
                endpoint,
                category: details.tags?.[0] || categorizeEndpoint(endpoint),
                auth: detectAuthFromSecurity(details.security, spec.securityDefinitions),
                params: extractOpenAPIParams(details.parameters),
                description: details.summary || details.description || `${method.toUpperCase()} ${endpoint}`,
                requestBody: details.requestBody,
                responses: Object.keys(details.responses || {}),
                source: 'openapi'
            });
        }
    }

    return apis;
}

// Helper functions
function isAPICall(url, method) {
    const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2'];
    if (staticExtensions.some(ext => url.toLowerCase().includes(ext))) return false;

    const apiPatterns = [/\/api\//i, /\/v[0-9]+\//i, /\.json/i, /graphql/i];
    if (apiPatterns.some(p => p.test(url))) return true;

    return ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);
}

function normalizeEndpoint(pathname) {
    return pathname
        .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:uuid')
        .replace(/\/[0-9]+/g, '/:id')
        .replace(/\/[a-f0-9]{24}/gi, '/:mongoId');
}

function categorizeEndpoint(endpoint) {
    const lower = endpoint.toLowerCase();
    if (/auth|login|logout|register|session/i.test(lower)) return 'Authentication';
    if (/user|account|profile/i.test(lower)) return 'User & Account';
    if (/live|inplay/i.test(lower)) return 'Live & Play';
    if (/prematch|fixture/i.test(lower)) return 'Pre-Match';
    if (/bet|wager|slip/i.test(lower)) return 'Betting';
    if (/sport|event|match/i.test(lower)) return 'Sports & Events';
    if (/transaction|history/i.test(lower)) return 'Transactions';
    if (/payment|deposit|withdraw|wallet/i.test(lower)) return 'Payments';
    return 'General';
}

function detectAuthFromHeaders(headers) {
    if (!headers) return 'None';
    const authHeader = headers.find(h => h.name.toLowerCase() === 'authorization');
    if (authHeader) {
        if (authHeader.value.startsWith('Bearer')) return 'Bearer Token';
        if (authHeader.value.startsWith('Basic')) return 'Basic Auth';
        return 'Custom Auth';
    }
    if (headers.find(h => h.name.toLowerCase() === 'x-api-key')) return 'API Key';
    return 'None';
}

function detectAuthFromSecurity(security, definitions) {
    if (!security || security.length === 0) return 'None';
    const secType = Object.keys(security[0])[0];
    if (!secType || !definitions?.[secType]) return 'Unknown';
    const def = definitions[secType];
    if (def.type === 'oauth2') return 'OAuth 2.0';
    if (def.type === 'apiKey') return 'API Key';
    if (def.type === 'http' && def.scheme === 'bearer') return 'Bearer Token';
    return 'Custom Auth';
}

function extractParamsFromURL(url) {
    try {
        const parsed = new URL(url);
        const params = [];
        parsed.searchParams.forEach((value, key) => {
            params.push({ name: key, type: inferType(value), value });
        });
        return params;
    } catch (e) {
        return [];
    }
}

function extractOpenAPIParams(parameters) {
    if (!parameters) return [];
    return parameters.map(p => ({
        name: p.name,
        type: p.type || p.schema?.type || 'string',
        required: p.required || false,
        in: p.in
    }));
}

function sanitizeHeaders(headers) {
    if (!headers) return [];
    const sensitive = ['cookie', 'authorization', 'x-api-key'];
    return headers.map(h => ({
        name: h.name,
        value: sensitive.includes(h.name.toLowerCase()) ? '[REDACTED]' : h.value
    }));
}

function parseRequestBody(postData) {
    if (!postData || !postData.text) return null;
    try {
        return JSON.parse(postData.text);
    } catch (e) {
        return postData.text;
    }
}

function inferType(value) {
    if (!isNaN(value)) return 'number';
    if (value === 'true' || value === 'false') return 'boolean';
    return 'string';
}

module.exports = createLoadTestRouter;
