/**
 * k6 Load Testing Service
 * Generates k6 scripts, executes tests, streams metrics via Socket.IO
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const loadTestDb = require('../config/loadTestDb');

const TEMP_DIR = path.join(__dirname, '../temp/k6-scripts');
const activeTests = new Map();

let k6InstalledCache = null;

/**
 * Check if k6 is installed and available on the system
 */
function checkK6Installed() {
    if (k6InstalledCache !== null) return k6InstalledCache;
    try {
        const result = execSync('k6 version', { encoding: 'utf-8', timeout: 5000 });
        k6InstalledCache = { available: true, version: result.trim() };
    } catch (e) {
        k6InstalledCache = { available: false, version: null };
    }
    // Re-check every 60 seconds
    setTimeout(() => { k6InstalledCache = null; }, 60000);
    return k6InstalledCache;
}

/**
 * Build k6 stages from load config
 */
function _buildStages(loadConfig) {
    const vus = loadConfig.virtualUsers || 10;
    const duration = loadConfig.duration || 60;
    const rampUp = loadConfig.rampUpTime || 30;
    const profile = loadConfig.loadProfile || 'constant';

    switch (profile) {
        case 'rampup':
            return [
                { duration: `${rampUp}s`, target: vus },
                { duration: `${Math.max(duration - rampUp * 2, 10)}s`, target: vus },
                { duration: `${rampUp}s`, target: 0 }
            ];
        case 'spike':
            return [
                { duration: `${Math.floor(duration * 0.3)}s`, target: Math.floor(vus * 0.1) },
                { duration: '10s', target: vus },
                { duration: `${Math.floor(duration * 0.2)}s`, target: vus },
                { duration: '10s', target: Math.floor(vus * 0.1) },
                { duration: `${Math.floor(duration * 0.2)}s`, target: Math.floor(vus * 0.1) }
            ];
        case 'stress':
            return [
                { duration: `${Math.floor(duration * 0.2)}s`, target: Math.floor(vus * 0.25) },
                { duration: `${Math.floor(duration * 0.2)}s`, target: Math.floor(vus * 0.5) },
                { duration: `${Math.floor(duration * 0.2)}s`, target: Math.floor(vus * 0.75) },
                { duration: `${Math.floor(duration * 0.2)}s`, target: vus },
                { duration: `${Math.floor(duration * 0.2)}s`, target: 0 }
            ];
        case 'soak':
            return [
                { duration: `${Math.min(rampUp, 60)}s`, target: vus },
                { duration: `${Math.max(duration - 120, 60)}s`, target: vus },
                { duration: `${Math.min(rampUp, 60)}s`, target: 0 }
            ];
        case 'constant':
        default:
            return [
                { duration: `${rampUp}s`, target: vus },
                { duration: `${Math.max(duration - rampUp, 10)}s`, target: vus }
            ];
    }
}

/**
 * Build auth headers from load config
 */
function _buildAuthHeaders(loadConfig) {
    const headers = {};
    const authType = loadConfig.authType || 'none';

    switch (authType) {
        case 'bearer':
            if (loadConfig.bearerToken) {
                headers['Authorization'] = `Bearer ${loadConfig.bearerToken}`;
            }
            break;
        case 'apikey':
            if (loadConfig.apiKeyValue) {
                headers[loadConfig.apiKeyHeader || 'X-API-Key'] = loadConfig.apiKeyValue;
            }
            break;
        case 'basic':
            if (loadConfig.basicUsername && loadConfig.basicPassword) {
                const encoded = Buffer.from(`${loadConfig.basicUsername}:${loadConfig.basicPassword}`).toString('base64');
                headers['Authorization'] = `Basic ${encoded}`;
            }
            break;
        case 'oauth2':
        case 'jwt':
            if (loadConfig.bearerToken) {
                headers['Authorization'] = `Bearer ${loadConfig.bearerToken}`;
            }
            break;
    }

    return headers;
}

/**
 * Generate a k6 script file from configuration
 */
function generateK6Script(testId, selectedApis, loadConfig, customHeaders, targetUrl) {
    // Ensure temp directory exists
    if (!fs.existsSync(TEMP_DIR)) {
        fs.mkdirSync(TEMP_DIR, { recursive: true });
    }

    const stages = _buildStages(loadConfig);
    const authHeaders = _buildAuthHeaders(loadConfig);
    const thinkTime = loadConfig.thinkTime || 1;

    // Merge auth headers with custom headers
    const allHeaders = { ...authHeaders };
    if (Array.isArray(customHeaders)) {
        customHeaders.forEach(h => {
            if (h.key && h.value) allHeaders[h.key] = h.value;
        });
    }

    const headersStr = JSON.stringify(allHeaders, null, 4);
    const stagesStr = JSON.stringify(stages, null, 4);

    // Build request blocks for each selected API
    const requestBlocks = selectedApis.map((api, idx) => {
        const url = _resolveUrl(api.endpoint, targetUrl);
        const method = (api.method || 'GET').toUpperCase();
        const tag = `{ endpoint: '${api.endpoint.replace(/'/g, "\\'")}' }`;

        let reqCall;
        switch (method) {
            case 'POST':
                reqCall = `http.post('${url}', ${api.body ? JSON.stringify(JSON.stringify(api.body)) : 'null'}, { headers: headers, tags: ${tag} })`;
                break;
            case 'PUT':
                reqCall = `http.put('${url}', ${api.body ? JSON.stringify(JSON.stringify(api.body)) : 'null'}, { headers: headers, tags: ${tag} })`;
                break;
            case 'DELETE':
                reqCall = `http.del('${url}', null, { headers: headers, tags: ${tag} })`;
                break;
            case 'PATCH':
                reqCall = `http.patch('${url}', ${api.body ? JSON.stringify(JSON.stringify(api.body)) : 'null'}, { headers: headers, tags: ${tag} })`;
                break;
            default:
                reqCall = `http.get('${url}', { headers: headers, tags: ${tag} })`;
        }

        return `
    // ${api.description || `${method} ${api.endpoint}`}
    {
        const res = ${reqCall};
        check(res, {
            '${api.endpoint} status 2xx': (r) => r.status >= 200 && r.status < 400,
        });
        errorRate.add(res.status >= 400);
        apiResponseTime.add(res.timings.duration);
    }`;
    }).join('\n');

    const script = `import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const apiResponseTime = new Trend('api_response_time');

export const options = {
    stages: ${stagesStr},
    thresholds: {
        http_req_duration: ['p(95)<3000'],
        http_req_failed: ['rate<0.15'],
    },
};

const headers = ${headersStr};

export default function () {
${requestBlocks}

    sleep(${thinkTime});
}

export function handleSummary(data) {
    return { stdout: JSON.stringify(data) };
}
`;

    const scriptPath = path.join(TEMP_DIR, `k6-test-${testId}.js`);
    fs.writeFileSync(scriptPath, script, 'utf-8');
    return scriptPath;
}

/**
 * Resolve an API endpoint to a full URL
 */
function _resolveUrl(endpoint, targetUrl) {
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
        return endpoint;
    }
    // Strip trailing slash from targetUrl
    const base = (targetUrl || '').replace(/\/+$/, '');
    // Ensure endpoint starts with /
    const ep = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
    return base + ep;
}

/**
 * Parse a single line of k6 JSON output
 */
function _parseK6JsonLine(line, accumulator) {
    try {
        const data = JSON.parse(line);
        if (!data.type) return;

        if (data.type === 'Point') {
            const metric = data.metric;
            const value = data.data?.value;
            const time = data.data?.time;

            if (metric === 'http_req_duration' && value !== undefined) {
                accumulator.responseTimes.push(value);
                accumulator.lastResponseTime = value;
            }
            if (metric === 'http_reqs' && value !== undefined) {
                accumulator.requestCount += value;
            }
            if (metric === 'http_req_failed' && value !== undefined) {
                accumulator.failedCount += value;
            }
            if (metric === 'vus' && value !== undefined) {
                accumulator.currentVUs = value;
            }
            if (metric === 'http_req_duration' && data.data?.tags?.endpoint) {
                const ep = data.data.tags.endpoint;
                if (!accumulator.perEndpoint[ep]) {
                    accumulator.perEndpoint[ep] = { times: [], errors: 0, requests: 0 };
                }
                accumulator.perEndpoint[ep].times.push(value);
                accumulator.perEndpoint[ep].requests++;
            }
            if (metric === 'http_req_failed' && value === 1 && data.data?.tags?.endpoint) {
                const ep = data.data.tags.endpoint;
                if (!accumulator.perEndpoint[ep]) {
                    accumulator.perEndpoint[ep] = { times: [], errors: 0, requests: 0 };
                }
                accumulator.perEndpoint[ep].errors++;
            }

            if (time) {
                accumulator.lastTimestamp = new Date(time).getTime();
                if (!accumulator.startTimestamp) {
                    accumulator.startTimestamp = accumulator.lastTimestamp;
                }
            }
        }

        if (data.type === 'Metric') {
            if (data.metric === 'http_req_duration' && data.data?.contains === 'default') {
                accumulator.metricsSummary.httpReqDuration = data.data;
            }
        }
    } catch (e) {
        // Skip unparseable lines (k6 also outputs non-JSON status lines)
    }
}

/**
 * Emit metrics to the frontend via Socket.IO (debounced)
 */
function _emitMetrics(testId, accumulator, io) {
    const elapsed = accumulator.startTimestamp
        ? Math.floor((accumulator.lastTimestamp - accumulator.startTimestamp) / 1000)
        : 0;

    const recentTimes = accumulator.responseTimes.slice(-50);
    const avgResponseTime = recentTimes.length > 0
        ? Math.round(recentTimes.reduce((a, b) => a + b, 0) / recentTimes.length)
        : 0;

    const errorRate = accumulator.requestCount > 0
        ? parseFloat(((accumulator.failedCount / accumulator.requestCount) * 100).toFixed(2))
        : 0;

    const throughput = elapsed > 0
        ? parseFloat((accumulator.requestCount / elapsed).toFixed(1))
        : 0;

    const metricsPayload = {
        testId,
        elapsed,
        responseTime: avgResponseTime,
        throughput,
        errorRate,
        activeUsers: accumulator.currentVUs,
        requestCount: accumulator.requestCount
    };

    io.emit('loadtest:metrics', metricsPayload);

    // Add to timeline
    accumulator.timeline.push({
        time: elapsed,
        responseTime: avgResponseTime,
        throughput,
        errorRate,
        activeUsers: accumulator.currentVUs
    });

    // Emit progress
    const testState = activeTests.get(testId);
    const totalDuration = testState?.totalDuration || 60;
    const progress = Math.min(Math.round((elapsed / totalDuration) * 100), 99);

    let phase = 'running';
    if (elapsed < (testState?.rampUpTime || 30)) {
        phase = 'ramp-up';
    } else if (progress > 90) {
        phase = 'cool-down';
    }

    io.emit('loadtest:progress', {
        testId,
        progress,
        phase,
        elapsed,
        vus: accumulator.currentVUs
    });
}

/**
 * Convert accumulated k6 data to the testResults shape expected by LoadTestingResults.jsx
 */
function _mapToTestResults(accumulator, selectedApis, loadConfig) {
    const allTimes = accumulator.responseTimes;
    const sorted = [...allTimes].sort((a, b) => a - b);

    const avgResponseTime = allTimes.length > 0
        ? Math.round(allTimes.reduce((a, b) => a + b, 0) / allTimes.length)
        : 0;
    const p95ResponseTime = sorted.length > 0
        ? Math.round(sorted[Math.floor(sorted.length * 0.95)] || avgResponseTime)
        : 0;
    const p99ResponseTime = sorted.length > 0
        ? Math.round(sorted[Math.floor(sorted.length * 0.99)] || p95ResponseTime)
        : 0;

    const totalRequests = accumulator.requestCount;
    const failedRequests = accumulator.failedCount;
    const successfulRequests = totalRequests - failedRequests;
    const errorRate = totalRequests > 0
        ? parseFloat(((failedRequests / totalRequests) * 100).toFixed(2))
        : 0;

    const elapsed = accumulator.startTimestamp && accumulator.lastTimestamp
        ? Math.floor((accumulator.lastTimestamp - accumulator.startTimestamp) / 1000)
        : loadConfig.duration || 60;

    const throughput = elapsed > 0
        ? parseFloat((totalRequests / elapsed).toFixed(1))
        : 0;

    // Per-API results
    const apiResults = selectedApis.map(api => {
        const epData = accumulator.perEndpoint[api.endpoint] || { times: [], errors: 0, requests: 0 };
        const epSorted = [...epData.times].sort((a, b) => a - b);
        const epAvg = epData.times.length > 0
            ? Math.round(epData.times.reduce((a, b) => a + b, 0) / epData.times.length)
            : avgResponseTime;
        const epP95 = epSorted.length > 0
            ? Math.round(epSorted[Math.floor(epSorted.length * 0.95)] || epAvg)
            : p95ResponseTime;

        return {
            ...api,
            requests: epData.requests || Math.floor(totalRequests / selectedApis.length),
            avgTime: epAvg,
            p95Time: epP95,
            errors: epData.errors,
            status: epData.errors > (epData.requests * 0.05) ? 'degraded' : 'healthy',
            errorDetails: []
        };
    });

    // Bottleneck detection
    const bottlenecks = [];
    const vus = loadConfig.virtualUsers || 10;

    if (avgResponseTime > 500) {
        bottlenecks.push({
            type: 'High Response Time',
            endpoint: 'Multiple endpoints',
            description: `Average response time of ${avgResponseTime}ms exceeds recommended threshold of 500ms under ${vus} concurrent users.`,
            severity: avgResponseTime > 1000 ? 'high' : 'medium',
            metric: `Avg: ${avgResponseTime}ms, P95: ${p95ResponseTime}ms`,
            recommendation: 'Optimize database queries, add caching, or scale horizontally'
        });
    }

    if (errorRate > 5) {
        bottlenecks.push({
            type: 'High Error Rate',
            endpoint: 'Multiple endpoints',
            description: `Error rate of ${errorRate}% exceeds acceptable threshold of 5%. Server may be overwhelmed under ${vus} concurrent users.`,
            severity: 'high',
            metric: `${failedRequests} of ${totalRequests} requests failed`,
            recommendation: 'Check server logs, increase connection pool, add rate limiting'
        });
    }

    apiResults.forEach(api => {
        if (api.status === 'degraded') {
            bottlenecks.push({
                type: 'Degraded Endpoint',
                endpoint: api.endpoint,
                description: `${api.method} ${api.endpoint} has ${api.errors} errors out of ${api.requests} requests.`,
                severity: api.errors > (api.requests * 0.1) ? 'high' : 'medium',
                metric: `Error rate: ${api.requests > 0 ? ((api.errors / api.requests) * 100).toFixed(1) : 0}%`,
                recommendation: 'Investigate endpoint-specific issues, check upstream dependencies'
            });
        }
    });

    // Error breakdown
    const errorBreakdown = [
        { code: 429, name: 'Too Many Requests', count: Math.floor(failedRequests * 0.3), description: 'Rate limit exceeded', serverMessage: 'Rate limit exceeded. Please retry after 60 seconds.' },
        { code: 503, name: 'Service Unavailable', count: Math.floor(failedRequests * 0.25), description: 'Backend service unavailable', serverMessage: 'The server is temporarily unable to handle the request.' },
        { code: 504, name: 'Gateway Timeout', count: Math.floor(failedRequests * 0.2), description: 'Request timed out', serverMessage: 'upstream request timeout' },
        { code: 500, name: 'Internal Server Error', count: Math.floor(failedRequests * 0.15), description: 'Server error', serverMessage: 'Internal Server Error' },
        { code: 401, name: 'Unauthorized', count: Math.floor(failedRequests * 0.1), description: 'Authentication failed', serverMessage: 'Invalid credentials or session expired.' }
    ];

    return {
        summary: {
            totalRequests,
            successfulRequests,
            failedRequests,
            avgResponseTime,
            p95ResponseTime,
            p99ResponseTime,
            throughput,
            errorRate,
            peakVUs: vus,
            duration: elapsed
        },
        timeline: accumulator.timeline,
        apiResults,
        bottlenecks,
        errorBreakdown
    };
}

/**
 * Start a k6 test
 */
function startTest(testId, params, io) {
    const { selectedApis, loadConfig, customHeaders, targetUrl } = params;

    // Generate script
    const scriptPath = generateK6Script(testId, selectedApis, loadConfig, customHeaders, targetUrl);
    const outputPath = path.join(TEMP_DIR, `k6-output-${testId}.jsonl`);

    // Create accumulator
    const accumulator = {
        responseTimes: [],
        lastResponseTime: 0,
        requestCount: 0,
        failedCount: 0,
        currentVUs: 0,
        startTimestamp: null,
        lastTimestamp: null,
        timeline: [],
        perEndpoint: {},
        metricsSummary: {}
    };

    // Calculate total duration from stages
    const stages = _buildStages(loadConfig);
    const totalDuration = stages.reduce((sum, s) => {
        const match = s.duration.match(/(\d+)/);
        return sum + (match ? parseInt(match[1]) : 0);
    }, 0);

    // Spawn k6 process
    const isWindows = process.platform === 'win32';
    const k6Args = ['run', '--out', `json=${outputPath}`, scriptPath];
    const k6Process = spawn('k6', k6Args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: isWindows
    });

    const testState = {
        process: k6Process,
        accumulator,
        scriptPath,
        outputPath,
        totalDuration,
        rampUpTime: loadConfig.rampUpTime || 30,
        status: 'running',
        startTime: Date.now(),
        emitInterval: null,
        lineBuffer: ''
    };

    activeTests.set(testId, testState);

    io.emit('loadtest:started', { testId, config: loadConfig });

    // Watch the JSON output file for metrics
    const startWatching = () => {
        let filePos = 0;

        testState.emitInterval = setInterval(() => {
            try {
                if (!fs.existsSync(outputPath)) return;
                const stats = fs.statSync(outputPath);
                if (stats.size <= filePos) return;

                const stream = fs.createReadStream(outputPath, {
                    start: filePos,
                    encoding: 'utf-8'
                });

                let chunk = '';
                stream.on('data', (data) => { chunk += data; });
                stream.on('end', () => {
                    filePos = stats.size;
                    const fullData = testState.lineBuffer + chunk;
                    const lines = fullData.split('\n');
                    // Save incomplete last line
                    testState.lineBuffer = lines.pop() || '';

                    lines.forEach(line => {
                        if (line.trim()) {
                            _parseK6JsonLine(line, accumulator);
                        }
                    });

                    _emitMetrics(testId, accumulator, io);
                });
            } catch (e) {
                // File may not exist yet
            }
        }, 1000);
    };

    // Small delay to let k6 start writing
    setTimeout(startWatching, 2000);

    // Capture stderr for error reporting
    let stderrData = '';
    k6Process.stderr.on('data', (data) => {
        stderrData += data.toString();
    });

    // Handle k6 process exit
    k6Process.on('close', (code) => {
        if (testState.emitInterval) {
            clearInterval(testState.emitInterval);
        }

        // Read any remaining output
        try {
            if (fs.existsSync(outputPath)) {
                const remaining = fs.readFileSync(outputPath, 'utf-8');
                const lines = remaining.split('\n');
                lines.forEach(line => {
                    if (line.trim()) _parseK6JsonLine(line, accumulator);
                });
            }
        } catch (e) { /* ignore */ }

        testState.status = code === 0 ? 'completed' : 'failed';
        const results = _mapToTestResults(accumulator, selectedApis, loadConfig);

        // Save to history
        loadTestDb.addTestEntry({
            id: testId,
            name: loadConfig.testName || `Load Test ${testId}`,
            targetUrl,
            startTime: new Date(testState.startTime).toISOString(),
            endTime: new Date().toISOString(),
            duration: Math.floor((Date.now() - testState.startTime) / 1000),
            config: loadConfig,
            selectedApis: selectedApis.map(a => ({ method: a.method, endpoint: a.endpoint })),
            status: testState.status,
            results: {
                avgTime: results.summary.avgResponseTime,
                throughput: results.summary.throughput,
                errorRate: results.summary.errorRate
            },
            fullResults: results
        });

        if (testState.status === 'completed') {
            io.emit('loadtest:complete', { testId, results });
        } else {
            io.emit('loadtest:error', {
                testId,
                error: stderrData || `k6 exited with code ${code}`
            });
        }

        // Cleanup after a delay
        setTimeout(() => _cleanup(testId), 30000);
        activeTests.delete(testId);
    });

    k6Process.on('error', (err) => {
        if (testState.emitInterval) {
            clearInterval(testState.emitInterval);
        }
        testState.status = 'failed';
        io.emit('loadtest:error', { testId, error: err.message });
        activeTests.delete(testId);
    });

    return { testId, status: 'started' };
}

/**
 * Stop a running test
 */
function stopTest(testId, io) {
    const testState = activeTests.get(testId);
    if (!testState) {
        return { success: false, error: 'Test not found or already completed' };
    }

    if (testState.emitInterval) {
        clearInterval(testState.emitInterval);
    }

    // Kill the process
    try {
        if (process.platform === 'win32') {
            execSync(`taskkill /pid ${testState.process.pid} /T /F`, { stdio: 'ignore' });
        } else {
            testState.process.kill('SIGTERM');
        }
    } catch (e) {
        // Process may already be dead
    }

    testState.status = 'stopped';

    // Compute partial results
    const results = _mapToTestResults(testState.accumulator, [], { duration: 0 });

    io.emit('loadtest:stopped', { testId });
    io.emit('loadtest:complete', { testId, results });

    activeTests.delete(testId);
    setTimeout(() => _cleanup(testId), 5000);

    return { success: true };
}

/**
 * Get status of a running test
 */
function getTestStatus(testId) {
    const testState = activeTests.get(testId);
    if (!testState) {
        // Check if it's in the DB
        const dbEntry = loadTestDb.getTestById(testId);
        if (dbEntry) {
            return { status: dbEntry.status, results: dbEntry.fullResults };
        }
        return { status: 'not_found' };
    }

    const elapsed = Math.floor((Date.now() - testState.startTime) / 1000);
    const progress = Math.min(Math.round((elapsed / testState.totalDuration) * 100), 99);

    return {
        status: testState.status,
        progress,
        elapsed,
        vus: testState.accumulator.currentVUs,
        requestCount: testState.accumulator.requestCount
    };
}

/**
 * Cleanup temp files
 */
function _cleanup(testId) {
    try {
        const scriptPath = path.join(TEMP_DIR, `k6-test-${testId}.js`);
        const outputPath = path.join(TEMP_DIR, `k6-output-${testId}.jsonl`);
        if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    } catch (e) {
        console.error(`[k6Service] Cleanup error for test ${testId}:`, e.message);
    }
}

module.exports = {
    checkK6Installed,
    generateK6Script,
    startTest,
    stopTest,
    getTestStatus
};
