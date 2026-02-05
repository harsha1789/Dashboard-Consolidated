/**
 * k6 Load Test Script - Betway Tanzania
 *
 * This script simulates 4000 virtual users hitting the Betway TZ platform
 * Run distributed across multiple machines for different source IPs
 *
 * Usage:
 *   Single machine: k6 run k6-betway-loadtest.js
 *   Distributed:    k6 run --out cloud k6-betway-loadtest.js
 *   With options:   k6 run --vus 1000 --duration 5m k6-betway-loadtest.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { randomItem, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const errorRate = new Rate('errors');
const apiResponseTime = new Trend('api_response_time');
const successfulRequests = new Counter('successful_requests');
const failedRequests = new Counter('failed_requests');

// Test configuration
export const options = {
    // Stages: Ramp up to 4000 users, hold, then ramp down
    stages: [
        { duration: '1m', target: 1000 },   // Ramp up to 1000 users
        { duration: '1m', target: 2000 },   // Ramp up to 2000 users
        { duration: '1m', target: 4000 },   // Ramp up to 4000 users
        { duration: '3m', target: 4000 },   // Hold at 4000 users for 3 minutes
        { duration: '1m', target: 2000 },   // Ramp down to 2000
        { duration: '1m', target: 0 },      // Ramp down to 0
    ],

    // Thresholds for pass/fail criteria
    thresholds: {
        http_req_duration: ['p(95)<3000'],     // 95% of requests should be < 3s
        http_req_failed: ['rate<0.15'],         // Error rate should be < 15%
        errors: ['rate<0.15'],                  // Custom error rate < 15%
    },

    // Tags for better organization
    tags: {
        testName: 'Betway-TZ-LoadTest',
        environment: 'production',
    },

    // Output options
    summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

// Base URL
const BASE_URL = 'https://mobi.betway.co.tz';
const API_BASE = 'https://info.betwayafrica.com';

// Discovered API endpoints from the website
const ENDPOINTS = {
    // High traffic endpoints (called frequently)
    highTraffic: [
        { path: '/', weight: 15 },
        { path: '/live', weight: 12 },
        { path: '/sports', weight: 10 },
        { path: '/sport/soccer/highlights', weight: 10 },
        { path: '/prematch', weight: 8 },
    ],

    // Medium traffic endpoints
    mediumTraffic: [
        { path: '/betslip', weight: 6 },
        { path: '/promotions', weight: 5 },
        { path: '/lobby/casino/all', weight: 5 },
        { path: '/lobby/livecasino/all', weight: 4 },
        { path: '/inplay', weight: 4 },
    ],

    // Low traffic endpoints (authenticated users)
    lowTraffic: [
        { path: '/account', weight: 3 },
        { path: '/history', weight: 2 },
        { path: '/transactions', weight: 2 },
        { path: '/login', weight: 3 },
        { path: '/registration', weight: 2 },
    ],

    // API endpoints
    apiEndpoints: [
        { path: '/api/v1.0/Origin/Tokens', base: API_BASE, weight: 8 },
        { path: '/api/v1.0/Origin/BannerTag?request.referringUrl=https://mobi.betway.co.tz', base: API_BASE, weight: 5 },
    ],

    // Static/Content endpoints
    contentEndpoints: [
        { path: '/casino', weight: 4 },
        { path: '/virtuals', weight: 3 },
        { path: '/jackpot', weight: 3 },
        { path: '/bonuses', weight: 3 },
        { path: '/results', weight: 2 },
        { path: '/statistics', weight: 2 },
    ],
};

// Helper function to select endpoint based on weight
function selectWeightedEndpoint(endpoints) {
    const totalWeight = endpoints.reduce((sum, e) => sum + e.weight, 0);
    let random = Math.random() * totalWeight;

    for (const endpoint of endpoints) {
        random -= endpoint.weight;
        if (random <= 0) {
            return endpoint;
        }
    }
    return endpoints[0];
}

// Common headers
const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
};

// Main test function
export default function() {
    // Simulate realistic user behavior with different scenarios
    const scenario = Math.random();

    if (scenario < 0.4) {
        // 40% - Browse sports/live betting (most common)
        browseSports();
    } else if (scenario < 0.65) {
        // 25% - Check promotions and casino
        browsePromotions();
    } else if (scenario < 0.85) {
        // 20% - User account actions
        userAccountFlow();
    } else {
        // 15% - API calls
        apiCalls();
    }

    // Random think time between requests (1-5 seconds)
    sleep(randomIntBetween(1, 5));
}

// Scenario 1: Browse Sports
function browseSports() {
    group('Browse Sports', function() {
        // Visit homepage
        let res = http.get(`${BASE_URL}/`, { headers, tags: { endpoint: 'homepage' } });
        checkResponse(res, 'Homepage');
        sleep(randomIntBetween(1, 3));

        // Visit live section
        res = http.get(`${BASE_URL}/live`, { headers, tags: { endpoint: 'live' } });
        checkResponse(res, 'Live');
        sleep(randomIntBetween(1, 2));

        // Visit sports highlights
        res = http.get(`${BASE_URL}/sport/soccer/highlights`, { headers, tags: { endpoint: 'soccer_highlights' } });
        checkResponse(res, 'Soccer Highlights');
        sleep(randomIntBetween(1, 2));

        // Sometimes check prematch
        if (Math.random() < 0.5) {
            res = http.get(`${BASE_URL}/prematch`, { headers, tags: { endpoint: 'prematch' } });
            checkResponse(res, 'Prematch');
        }

        // Sometimes check betslip
        if (Math.random() < 0.3) {
            res = http.get(`${BASE_URL}/betslip`, { headers, tags: { endpoint: 'betslip' } });
            checkResponse(res, 'Betslip');
        }
    });
}

// Scenario 2: Browse Promotions and Casino
function browsePromotions() {
    group('Browse Promotions', function() {
        // Visit promotions
        let res = http.get(`${BASE_URL}/promotions`, { headers, tags: { endpoint: 'promotions' } });
        checkResponse(res, 'Promotions');
        sleep(randomIntBetween(1, 3));

        // Visit casino
        res = http.get(`${BASE_URL}/lobby/casino/all`, { headers, tags: { endpoint: 'casino' } });
        checkResponse(res, 'Casino');
        sleep(randomIntBetween(1, 2));

        // Sometimes check live casino
        if (Math.random() < 0.5) {
            res = http.get(`${BASE_URL}/lobby/livecasino/all`, { headers, tags: { endpoint: 'livecasino' } });
            checkResponse(res, 'Live Casino');
        }

        // Sometimes check virtuals
        if (Math.random() < 0.3) {
            res = http.get(`${BASE_URL}/virtuals`, { headers, tags: { endpoint: 'virtuals' } });
            checkResponse(res, 'Virtuals');
        }

        // Sometimes check jackpot
        if (Math.random() < 0.3) {
            res = http.get(`${BASE_URL}/jackpot`, { headers, tags: { endpoint: 'jackpot' } });
            checkResponse(res, 'Jackpot');
        }
    });
}

// Scenario 3: User Account Flow
function userAccountFlow() {
    group('User Account', function() {
        // Visit login page
        let res = http.get(`${BASE_URL}/login`, { headers, tags: { endpoint: 'login' } });
        checkResponse(res, 'Login Page');
        sleep(randomIntBetween(2, 4));

        // Visit account page (simulating logged in user)
        res = http.get(`${BASE_URL}/account`, { headers, tags: { endpoint: 'account' } });
        checkResponse(res, 'Account');
        sleep(randomIntBetween(1, 2));

        // Check history
        if (Math.random() < 0.5) {
            res = http.get(`${BASE_URL}/history`, { headers, tags: { endpoint: 'history' } });
            checkResponse(res, 'History');
        }

        // Check transactions
        if (Math.random() < 0.4) {
            res = http.get(`${BASE_URL}/transactions`, { headers, tags: { endpoint: 'transactions' } });
            checkResponse(res, 'Transactions');
        }
    });
}

// Scenario 4: API Calls
function apiCalls() {
    group('API Calls', function() {
        // Get tokens
        let res = http.get(`${API_BASE}/api/v1.0/Origin/Tokens`, {
            headers: {
                ...headers,
                'Referer': BASE_URL,
                'Origin': BASE_URL,
            },
            tags: { endpoint: 'api_tokens' }
        });
        checkResponse(res, 'API Tokens');
        sleep(randomIntBetween(1, 2));

        // Get banner tags
        res = http.get(`${API_BASE}/api/v1.0/Origin/BannerTag?request.referringUrl=${BASE_URL}`, {
            headers: {
                ...headers,
                'Referer': BASE_URL,
                'x-ot-origin': BASE_URL,
            },
            tags: { endpoint: 'api_banner' }
        });
        checkResponse(res, 'API Banner');
    });
}

// Helper function to check response and record metrics
function checkResponse(res, name) {
    const success = check(res, {
        [`${name} - status is 200-399`]: (r) => r.status >= 200 && r.status < 400,
        [`${name} - response time < 3s`]: (r) => r.timings.duration < 3000,
    });

    // Record custom metrics
    apiResponseTime.add(res.timings.duration);

    if (success) {
        successfulRequests.add(1);
        errorRate.add(0);
    } else {
        failedRequests.add(1);
        errorRate.add(1);

        // Log errors for debugging
        if (res.status >= 400) {
            console.log(`[ERROR] ${name}: Status ${res.status} - ${res.url}`);
        }
    }

    return success;
}

// Setup function - runs once before test
export function setup() {
    console.log('========================================');
    console.log('Betway Tanzania Load Test Starting');
    console.log('========================================');
    console.log(`Target: ${BASE_URL}`);
    console.log(`Max VUs: 4000`);
    console.log(`Duration: ~8 minutes`);
    console.log('========================================');

    // Verify target is reachable
    const res = http.get(`${BASE_URL}/`);
    if (res.status !== 200) {
        console.log(`WARNING: Target returned status ${res.status}`);
    }

    return { startTime: new Date().toISOString() };
}

// Teardown function - runs once after test
export function teardown(data) {
    console.log('========================================');
    console.log('Load Test Completed');
    console.log(`Started: ${data.startTime}`);
    console.log(`Ended: ${new Date().toISOString()}`);
    console.log('========================================');
}

// Handle summary
export function handleSummary(data) {
    const summary = {
        testName: 'Betway Tanzania Load Test',
        timestamp: new Date().toISOString(),
        duration: data.state.testRunDurationMs,
        vus: {
            max: data.metrics.vus_max ? data.metrics.vus_max.values.max : 0,
        },
        requests: {
            total: data.metrics.http_reqs ? data.metrics.http_reqs.values.count : 0,
            rate: data.metrics.http_reqs ? data.metrics.http_reqs.values.rate : 0,
        },
        responseTime: {
            avg: data.metrics.http_req_duration ? data.metrics.http_req_duration.values.avg : 0,
            min: data.metrics.http_req_duration ? data.metrics.http_req_duration.values.min : 0,
            max: data.metrics.http_req_duration ? data.metrics.http_req_duration.values.max : 0,
            p90: data.metrics.http_req_duration ? data.metrics.http_req_duration.values['p(90)'] : 0,
            p95: data.metrics.http_req_duration ? data.metrics.http_req_duration.values['p(95)'] : 0,
            p99: data.metrics.http_req_duration ? data.metrics.http_req_duration.values['p(99)'] : 0,
        },
        errors: {
            rate: data.metrics.http_req_failed ? data.metrics.http_req_failed.values.rate : 0,
            count: data.metrics.http_req_failed ? data.metrics.http_req_failed.values.passes : 0,
        },
    };

    return {
        'stdout': textSummary(data, { indent: ' ', enableColors: true }),
        'loadtest-summary.json': JSON.stringify(summary, null, 2),
        'loadtest-results.json': JSON.stringify(data, null, 2),
    };
}

// Text summary helper
function textSummary(data, options) {
    let output = '\n';
    output += '╔══════════════════════════════════════════════════════════════╗\n';
    output += '║           BETWAY TANZANIA LOAD TEST RESULTS                  ║\n';
    output += '╠══════════════════════════════════════════════════════════════╣\n';

    if (data.metrics.http_reqs) {
        output += `║  Total Requests:     ${String(data.metrics.http_reqs.values.count).padStart(10)}                       ║\n`;
        output += `║  Request Rate:       ${String(data.metrics.http_reqs.values.rate.toFixed(2)).padStart(10)} req/s                  ║\n`;
    }

    if (data.metrics.http_req_duration) {
        output += `║  Avg Response Time:  ${String(data.metrics.http_req_duration.values.avg.toFixed(2)).padStart(10)} ms                    ║\n`;
        output += `║  P95 Response Time:  ${String(data.metrics.http_req_duration.values['p(95)'].toFixed(2)).padStart(10)} ms                    ║\n`;
    }

    if (data.metrics.http_req_failed) {
        const errorPct = (data.metrics.http_req_failed.values.rate * 100).toFixed(2);
        output += `║  Error Rate:         ${String(errorPct).padStart(10)} %                     ║\n`;
    }

    output += '╚══════════════════════════════════════════════════════════════╝\n';

    return output;
}
