/**
 * AI-Powered Load Test Analyzer
 * Uses OpenRouter API to analyze captured game traffic,
 * detect providers, classify endpoints, and generate K6 scripts.
 */

const https = require('https');

// Known provider patterns (local detection, no AI needed)
const PROVIDER_PATTERNS = [
    { pattern: /insvr\.com/i, provider: 'Habanero' },
    { pattern: /pragmaticplay/i, provider: 'Pragmatic Play' },
    { pattern: /evolution/i, provider: 'Evolution' },
    { pattern: /netent/i, provider: 'NetEnt' },
    { pattern: /microgaming/i, provider: 'Microgaming' },
    { pattern: /playtech/i, provider: 'Playtech' },
    { pattern: /betsoft/i, provider: 'BetSoft' },
    { pattern: /amusnet/i, provider: 'Amusnet Gaming' },
    { pattern: /spinomenal/i, provider: 'Spinomenal' },
    { pattern: /rubyplay/i, provider: 'Ruby Play' },
    { pattern: /booming/i, provider: 'Booming Games' },
    { pattern: /ezugi/i, provider: 'Ezugi' },
    { pattern: /redtiger/i, provider: 'Red Tiger' },
    { pattern: /yggdrasil|ygg/i, provider: 'YGG' },
    { pattern: /playngo|play-n-go/i, provider: 'Play N Go' },
    { pattern: /nolimit/i, provider: 'No Limit City' },
    { pattern: /spribe/i, provider: 'Spribe' },
    { pattern: /turbogames/i, provider: 'Turbo Games' },
];

// Endpoint classification patterns
const ENDPOINT_CATEGORIES = [
    { pattern: /spin|play|action|game.*post/i, category: 'spin', label: 'Spin/Play' },
    { pattern: /bet|wager|stake/i, category: 'bet', label: 'Bet Placement' },
    { pattern: /balance|wallet|funds/i, category: 'balance', label: 'Balance Check' },
    { pattern: /launch|init|start|session|login/i, category: 'launch', label: 'Game Launch' },
    { pattern: /history|transaction|log/i, category: 'history', label: 'History' },
    { pattern: /heartbeat|ping|alive|health/i, category: 'heartbeat', label: 'Heartbeat' },
    { pattern: /categor|lobby|list|provider/i, category: 'catalog', label: 'Game Catalog' },
    { pattern: /jackpot|progressive/i, category: 'jackpot', label: 'Jackpot' },
];

const SYSTEM_PROMPT = `You are an expert gaming industry load test architect. Analyze captured network traffic from casino games and return a JSON object.

You MUST return ONLY valid JSON with this structure:
{
  "provider_analysis": {
    "provider_name": "string",
    "confidence": "high|medium|low",
    "architecture_type": "REST_API|WEBSOCKET|HYBRID",
    "game_type": "slots|table_games|live_dealer|crash_games"
  },
  "api_endpoints": [
    {
      "url": "full URL",
      "method": "GET|POST",
      "category": "spin|bet|balance|launch|heartbeat|catalog|other",
      "description": "what this endpoint does",
      "critical_for_load_test": true|false
    }
  ],
  "performance_profile": {
    "recommended_vus": 100,
    "recommended_duration_seconds": 300,
    "recommended_ramp_up_seconds": 60,
    "expected_response_time_p95_ms": 500,
    "rate_limit_detected": false,
    "notes": "string"
  },
  "k6_script": "complete runnable K6 JavaScript code as a string",
  "challenges": ["list of potential issues"],
  "recommendations": ["list of optimization tips"]
}

Rules:
- Return ONLY the JSON object, no markdown, no explanation
- The k6_script must be complete and runnable
- Include proper auth handling in k6_script
- Include stage-based load progression
- Include realistic think time between actions`;

/**
 * Detect provider from URL patterns (no AI needed)
 */
function detectProviderLocal(apis) {
    const urls = apis.map(a => a.fullUrl || a.url || a.endpoint || '').join(' ');
    for (const { pattern, provider } of PROVIDER_PATTERNS) {
        if (pattern.test(urls)) return provider;
    }
    return null;
}

/**
 * Classify an endpoint by its URL/method
 */
function classifyEndpoint(api) {
    const url = api.fullUrl || api.url || api.endpoint || '';
    const method = (api.method || 'GET').toUpperCase();
    const combined = `${method} ${url}`;

    for (const { pattern, category, label } of ENDPOINT_CATEGORIES) {
        if (pattern.test(combined)) return { category, label };
    }

    // POST requests to game servers are likely spin/bet
    if (method === 'POST' && /game|gs-|play/i.test(url)) {
        return { category: 'spin', label: 'Spin/Play' };
    }

    return { category: 'other', label: 'Other' };
}

/**
 * Classify all APIs locally
 */
function classifyApisLocal(apis) {
    return apis.map(api => ({
        ...api,
        ...classifyEndpoint(api)
    }));
}

/**
 * Generate a K6 script from config (no AI, template-based)
 */
function generateK6Script(config) {
    const { targetUrl, selectedApis, loadConfig, customHeaders } = config;
    const vus = loadConfig?.virtualUsers || 10;
    const duration = loadConfig?.duration || 60;
    const rampUp = loadConfig?.rampUpTime || 10;

    const headerLines = (customHeaders || [])
        .filter(h => h.key && h.value)
        .map(h => `        '${h.key}': '${h.value}',`)
        .join('\n');

    const apiCalls = (selectedApis || []).map((api, i) => {
        const method = (api.method || 'GET').toLowerCase();
        const url = api.fullUrl || `${targetUrl}${api.endpoint}`;
        const bodyStr = api.body ? JSON.stringify(api.body) : null;

        if (method === 'post' && bodyStr) {
            return `
    // ${api.description || api.endpoint}
    const res${i} = http.post('${url}', JSON.stringify(${bodyStr}), { headers: params.headers });
    check(res${i}, { '${api.endpoint} status 200': (r) => r.status === 200 });
    apiDuration.add(res${i}.timings.duration);
    sleep(thinkTime);`;
        }
        return `
    // ${api.description || api.endpoint}
    const res${i} = http.${method}('${url}', { headers: params.headers });
    check(res${i}, { '${api.endpoint} status 200': (r) => r.status === 200 });
    apiDuration.add(res${i}.timings.duration);
    sleep(thinkTime);`;
    }).join('\n');

    return `import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const apiSuccessRate = new Rate('api_success_rate');
const apiDuration = new Trend('api_duration');

export let options = {
    stages: [
        { duration: '${rampUp}s', target: ${vus} },
        { duration: '${duration - rampUp}s', target: ${vus} },
        { duration: '${Math.floor(rampUp / 2)}s', target: 0 },
    ],
    thresholds: {
        'http_req_duration': ['p(95)<2000'],
        'api_success_rate': ['rate>0.90'],
    },
};

const params = {
    headers: {
${headerLines}
    },
};

const thinkTime = 1; // seconds between requests

export default function () {
    group('${config.name || 'Load Test'}', function () {
${apiCalls}
    });
}
`;
}

/**
 * Call OpenRouter AI for advanced analysis
 */
function callOpenRouterAI(gameUrl, capturedApis, providerHint) {
    return new Promise((resolve, reject) => {
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
            return reject(new Error('OPENROUTER_API_KEY not configured'));
        }

        const userMessage = `Analyze this game traffic and generate a load test:

Game URL: ${gameUrl}
Provider Hint: ${providerHint || 'auto-detect'}
Total APIs captured: ${capturedApis.length}

Captured API calls:
${JSON.stringify(capturedApis.slice(0, 20), null, 2)}`;

        const body = JSON.stringify({
            model: 'anthropic/claude-sonnet-4-20250514',
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: userMessage }
            ],
            max_tokens: 4000,
            temperature: 0
        });

        const req = https.request({
            hostname: 'openrouter.ai',
            path: '/api/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'http://localhost:3001',
                'X-Title': 'Load Test Analyzer'
            }
        }, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    const content = parsed.choices?.[0]?.message?.content || '';
                    // Extract JSON from response
                    const jsonMatch = content.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        resolve(JSON.parse(jsonMatch[0]));
                    } else {
                        reject(new Error('No JSON in AI response'));
                    }
                } catch (e) {
                    reject(new Error('Failed to parse AI response: ' + e.message));
                }
            });
        });

        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

/**
 * Main analysis function — combines local + AI analysis
 */
async function analyzeGameTraffic(gameUrl, capturedApis, providerHint) {
    // Step 1: Local provider detection
    const localProvider = providerHint || detectProviderLocal(capturedApis);

    // Step 2: Local endpoint classification
    const classifiedApis = classifyApisLocal(capturedApis);

    // Step 3: Try AI analysis for richer results
    let aiResult = null;
    try {
        aiResult = await callOpenRouterAI(gameUrl, capturedApis, localProvider);
    } catch (e) {
        console.log('[AI Analyzer] AI analysis skipped:', e.message);
    }

    // Merge local + AI results
    const result = {
        provider_analysis: aiResult?.provider_analysis || {
            provider_name: localProvider || 'Unknown',
            confidence: localProvider ? 'high' : 'low',
            architecture_type: capturedApis.some(a => (a.method || '').toUpperCase() === 'POST') ? 'REST_API' : 'REST_API',
            game_type: 'slots'
        },
        api_endpoints: aiResult?.api_endpoints || classifiedApis.map(api => ({
            url: api.fullUrl || api.endpoint,
            method: api.method || 'GET',
            category: api.category,
            description: api.description || `${api.method} ${api.endpoint}`,
            critical_for_load_test: ['spin', 'bet', 'launch'].includes(api.category)
        })),
        performance_profile: aiResult?.performance_profile || {
            recommended_vus: 50,
            recommended_duration_seconds: 300,
            recommended_ramp_up_seconds: 30,
            expected_response_time_p95_ms: 500,
            rate_limit_detected: false,
            notes: 'Default profile — adjust based on your infrastructure capacity'
        },
        k6_script: aiResult?.k6_script || null,
        challenges: aiResult?.challenges || [],
        recommendations: aiResult?.recommendations || [
            'Session tokens may expire — implement token refresh in load test',
            'Start with low VU count and increase gradually',
            'Monitor server-side metrics during test'
        ],
        classified_apis: classifiedApis
    };

    return result;
}

/**
 * Make a real HTTP request to validate an API endpoint
 */
function validateApi(api, customHeaders) {
    return new Promise((resolve) => {
        const url = api.fullUrl || api.url;
        if (!url) {
            return resolve({ endpoint: api.endpoint, success: false, error: 'No URL', status: 0, responseTime: 0 });
        }

        let parsed;
        try { parsed = new URL(url); } catch (e) {
            return resolve({ endpoint: api.endpoint, success: false, error: 'Invalid URL', status: 0, responseTime: 0 });
        }

        const headers = { 'Accept': 'application/json' };
        (customHeaders || []).forEach(h => {
            if (h.key && h.value) headers[h.key] = h.value;
        });

        const method = (api.method || 'GET').toUpperCase();
        const bodyData = method === 'POST' && api.body ? JSON.stringify(api.body) : null;
        if (bodyData && !headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
        }

        const startTime = Date.now();

        const options = {
            hostname: parsed.hostname,
            port: parsed.port || 443,
            path: parsed.pathname + parsed.search,
            method,
            headers,
            servername: parsed.hostname,
            timeout: 10000
        };

        const proto = parsed.protocol === 'https:' ? https : require('http');

        const req = proto.request(options, res => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => {
                const responseTime = Date.now() - startTime;
                resolve({
                    endpoint: api.endpoint || parsed.pathname,
                    method,
                    fullUrl: url,
                    status: res.statusCode,
                    responseTime,
                    bodyPreview: body.substring(0, 300),
                    success: res.statusCode >= 200 && res.statusCode < 400,
                    contentType: res.headers['content-type'] || ''
                });
            });
        });

        req.on('error', e => {
            resolve({
                endpoint: api.endpoint || parsed.pathname,
                method,
                fullUrl: url,
                status: 0,
                responseTime: Date.now() - startTime,
                error: e.message,
                success: false
            });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({
                endpoint: api.endpoint || parsed.pathname,
                method,
                fullUrl: url,
                status: 0,
                responseTime: 10000,
                error: 'Request timed out',
                success: false
            });
        });

        if (bodyData) req.write(bodyData);
        req.end();
    });
}

module.exports = {
    analyzeGameTraffic,
    validateApi,
    generateK6Script,
    detectProviderLocal,
    classifyApisLocal,
    PROVIDER_PATTERNS
};
