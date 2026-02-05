/**
 * Betway Tanzania - Distributed Load Test Script
 *
 * Run this from your machine to contribute to the load test.
 * Each person running this = 1 unique IP address!
 *
 * Usage: k6 run betway-loadtest.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');

// ============================================
// CONFIGURATION - Adjust if needed
// ============================================
const CONFIG = {
    // Number of virtual users YOU will simulate
    virtualUsers: 1000,

    // Test duration
    duration: '5m',

    // Target website
    baseUrl: 'https://mobi.betway.co.tz',
};

// Test options
export const options = {
    // Ramp up pattern
    stages: [
        { duration: '30s', target: Math.floor(CONFIG.virtualUsers * 0.25) },  // 25%
        { duration: '30s', target: Math.floor(CONFIG.virtualUsers * 0.5) },   // 50%
        { duration: '30s', target: Math.floor(CONFIG.virtualUsers * 0.75) },  // 75%
        { duration: '30s', target: CONFIG.virtualUsers },                      // 100%
        { duration: '2m', target: CONFIG.virtualUsers },                       // Hold
        { duration: '1m', target: 0 },                                         // Ramp down
    ],

    // Thresholds
    thresholds: {
        http_req_duration: ['p(95)<5000'],  // 95% requests < 5s
        http_req_failed: ['rate<0.3'],       // Less than 30% errors
    },
};

// Headers to mimic real browser
const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Connection': 'keep-alive',
};

// Endpoints to test (discovered from the website)
const ENDPOINTS = [
    // High traffic - Home & Sports
    { path: '/', weight: 20 },
    { path: '/live', weight: 15 },
    { path: '/sports', weight: 12 },
    { path: '/sport/soccer/highlights', weight: 10 },

    // Medium traffic - Features
    { path: '/prematch', weight: 8 },
    { path: '/betslip', weight: 8 },
    { path: '/promotions', weight: 6 },
    { path: '/lobby/casino/all', weight: 5 },

    // Lower traffic - Account & Others
    { path: '/account', weight: 4 },
    { path: '/login', weight: 4 },
    { path: '/history', weight: 3 },
    { path: '/results', weight: 3 },
    { path: '/virtuals', weight: 2 },
];

// Select endpoint based on weight (more realistic traffic pattern)
function selectEndpoint() {
    const totalWeight = ENDPOINTS.reduce((sum, e) => sum + e.weight, 0);
    let random = Math.random() * totalWeight;

    for (const endpoint of ENDPOINTS) {
        random -= endpoint.weight;
        if (random <= 0) {
            return endpoint.path;
        }
    }
    return ENDPOINTS[0].path;
}

// Main test function - runs for each virtual user
export default function() {
    // Select a random endpoint based on realistic traffic patterns
    const endpoint = selectEndpoint();
    const url = `${CONFIG.baseUrl}${endpoint}`;

    // Make the request
    const response = http.get(url, {
        headers,
        timeout: '30s',
    });

    // Check response
    const success = check(response, {
        'status is OK (2xx/3xx)': (r) => r.status >= 200 && r.status < 400,
        'response time < 5s': (r) => r.timings.duration < 5000,
    });

    // Record metrics
    responseTime.add(response.timings.duration);
    errorRate.add(!success);

    // Random think time (simulates real user behavior)
    sleep(Math.random() * 3 + 1); // 1-4 seconds
}

// Runs once at the start
export function setup() {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║         BETWAY TANZANIA - DISTRIBUTED LOAD TEST            ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║  Target:        ${CONFIG.baseUrl.padEnd(40)}║`);
    console.log(`║  Virtual Users: ${String(CONFIG.virtualUsers).padEnd(40)}║`);
    console.log(`║  Duration:      ${CONFIG.duration.padEnd(40)}║`);
    console.log(`║  Your IP:       Check at https://whatismyip.com${' '.repeat(12)}║`);
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');

    // Verify target is reachable
    const res = http.get(CONFIG.baseUrl, { headers });
    if (res.status !== 200) {
        console.log(`⚠ Warning: Target returned status ${res.status}`);
    } else {
        console.log(`✓ Target is reachable`);
    }

    return { startTime: new Date().toISOString() };
}

// Runs once at the end
export function teardown(data) {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                    TEST COMPLETED                          ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║  Started:  ${data.startTime.padEnd(46)}║`);
    console.log(`║  Ended:    ${new Date().toISOString().padEnd(46)}║`);
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('Please share your results with the test coordinator!');
    console.log('');
}
