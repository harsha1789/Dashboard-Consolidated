# Load Testing - API Discovery Documentation

## Table of Contents
1. [Overview](#overview)
2. [Current Implementation (Simulation)](#current-implementation-simulation)
3. [How Real API Discovery Works](#how-real-api-discovery-works)
4. [Architecture Flow](#architecture-flow)
5. [Libraries & Tools](#libraries--tools)
6. [Future Implementation Roadmap](#future-implementation-roadmap)

---

## Overview

The Load Testing module provides API discovery and performance testing capabilities. This document explains how the API discovery system works.

### Important Note
> **Current Status**: The API discovery is currently a **SIMULATION/MOCK** implementation for demonstration purposes. It does NOT actually crawl websites or intercept network traffic. Instead, it uses URL pattern matching to return pre-defined API templates.

---

## Current Implementation (Simulation)

### How It Works Now

```
┌─────────────────────────────────────────────────────────────────┐
│                    CURRENT FLOW (MOCK)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User enters URL ──► URL Pattern Detection ──► Return Static   │
│                           │                     API Templates   │
│                           │                                     │
│                           ▼                                     │
│                   ┌───────────────┐                             │
│                   │ URL Contains? │                             │
│                   └───────┬───────┘                             │
│                           │                                     │
│         ┌─────────────────┼─────────────────┐                   │
│         │                 │                 │                   │
│         ▼                 ▼                 ▼                   │
│   "bet/gaming"      "shop/store"      "bank/pay"               │
│        │                 │                 │                    │
│        ▼                 ▼                 ▼                    │
│   72 Betting        22 E-commerce     11 Banking               │
│   APIs              APIs              APIs                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### URL Pattern Detection Logic

```javascript
const generateMockApis = () => {
    const url = targetUrl.toLowerCase();

    // Betting/Gaming websites
    if (url.includes('bet') || url.includes('gaming') ||
        url.includes('casino') || url.includes('sport')) {
        return generateBettingApis();  // 72 APIs
    }
    // E-commerce websites
    else if (url.includes('shop') || url.includes('store') ||
             url.includes('cart')) {
        return generateEcommerceApis();  // 22 APIs
    }
    // Banking/Fintech websites
    else if (url.includes('bank') || url.includes('pay') ||
             url.includes('finance')) {
        return generateBankingApis();  // 11 APIs
    }
    // Default - generic APIs
    else {
        return generateGenericApis();  // 13 APIs
    }
};
```

### Pre-defined API Templates

Each website type has a curated list of common APIs:

| Website Type | Detection Keywords | APIs Count | Categories |
|--------------|-------------------|------------|------------|
| Betting | bet, gaming, casino, sport, odds | 72 | Auth, Pre-Match, Live, Build-A-Bet, Outright, Cashout, Betslip, Transactions, Wallet, Promotions, System |
| E-commerce | shop, store, cart, amazon, ebay | 22 | Auth, Products, Cart, Orders, Payments |
| Banking | bank, pay, finance, money, wallet | 11 | Auth, Accounts, Transfers, Bills |
| Social | social, facebook, twitter | 10 | Auth, Feed, Posts, Users, Messages |
| Generic | (default) | 13 | Auth, Users, Data, Reports, System |

---

## How Real API Discovery Works

### Real API Discovery Methods

Real API discovery uses multiple techniques to identify endpoints:

```
┌─────────────────────────────────────────────────────────────────┐
│                 REAL API DISCOVERY METHODS                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. PASSIVE ANALYSIS                                            │
│     ├── HAR File Import (Browser DevTools export)               │
│     ├── Proxy Interception (mitmproxy, Burp Suite)              │
│     └── Traffic Replay Analysis                                 │
│                                                                 │
│  2. ACTIVE CRAWLING                                             │
│     ├── Web Crawler (Puppeteer, Playwright)                     │
│     ├── JavaScript Execution & XHR Capture                      │
│     ├── Form Submission Detection                               │
│     └── Link Following & Page Analysis                          │
│                                                                 │
│  3. SPECIFICATION PARSING                                       │
│     ├── OpenAPI/Swagger Detection & Import                      │
│     ├── GraphQL Introspection                                   │
│     ├── WSDL/SOAP Analysis                                      │
│     └── API Documentation Scraping                              │
│                                                                 │
│  4. INTELLIGENT DETECTION                                       │
│     ├── Pattern Recognition (ML/Regex)                          │
│     ├── Common Endpoint Guessing                                │
│     ├── Parameter Fuzzing                                       │
│     └── Response Analysis                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Real Implementation Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    REAL IMPLEMENTATION                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐    ┌──────────────┐    ┌─────────────────┐       │
│  │  Client  │───►│   Backend    │───►│  Discovery      │       │
│  │  (React) │    │   (Node.js)  │    │  Engine         │       │
│  └──────────┘    └──────────────┘    └─────────────────┘       │
│                         │                     │                 │
│                         │                     ▼                 │
│                         │            ┌─────────────────┐       │
│                         │            │  Puppeteer/     │       │
│                         │            │  Playwright     │       │
│                         │            │  (Headless      │       │
│                         │            │   Browser)      │       │
│                         │            └────────┬────────┘       │
│                         │                     │                 │
│                         │                     ▼                 │
│                         │            ┌─────────────────┐       │
│                         │            │  Network        │       │
│                         │            │  Interceptor    │       │
│                         │            └────────┬────────┘       │
│                         │                     │                 │
│                         │                     ▼                 │
│                         │            ┌─────────────────┐       │
│                         │            │  API Classifier │       │
│                         │            │  (ML Model)     │       │
│                         │            └────────┬────────┘       │
│                         │                     │                 │
│                         ▼                     ▼                 │
│                  ┌─────────────────────────────────┐           │
│                  │      Discovered APIs Database    │           │
│                  │   (MongoDB/PostgreSQL)           │           │
│                  └─────────────────────────────────┘           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Architecture Flow

### Current Flow (Frontend Only - Mock)

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: User Input                                              │
├─────────────────────────────────────────────────────────────────┤
│ User enters: https://mobi.betway.co.tz                          │
│ User clicks: "Discover APIs"                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: URL Analysis (Client-side)                              │
├─────────────────────────────────────────────────────────────────┤
│ File: LoadTestingScanner.jsx                                    │
│                                                                 │
│ const url = targetUrl.toLowerCase();                            │
│ if (url.includes('bet')) {                                      │
│     return generateBettingApis();                               │
│ }                                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: Simulated Scan Progress                                 │
├─────────────────────────────────────────────────────────────────┤
│ Phases displayed (UI only, no real scanning):                   │
│ 1. Initializing                                                 │
│ 2. Crawling Pages                                               │
│ 3. Analyzing Network                                            │
│ 4. Detecting APIs                                               │
│ 5. Classifying Endpoints                                        │
│ 6. Finalizing                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: Return Pre-defined APIs                                 │
├─────────────────────────────────────────────────────────────────┤
│ Returns array of API objects:                                   │
│ {                                                               │
│   id: 101,                                                      │
│   method: 'POST',                                               │
│   endpoint: '/api/v1/auth/login',                               │
│   category: 'Authentication',                                   │
│   auth: 'None',                                                 │
│   params: [{name: 'msisdn', type: 'string'}],                   │
│   description: 'User login'                                     │
│ }                                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 5: Display in UI                                           │
├─────────────────────────────────────────────────────────────────┤
│ File: LoadTestingAPIList.jsx                                    │
│ - Group by category                                             │
│ - Allow selection                                               │
│ - Allow editing (params, auth, headers)                         │
└─────────────────────────────────────────────────────────────────┘
```

### Component Structure

```
src/components/loadtesting/
├── LoadTestingDashboard.jsx    # Main orchestrator
├── LoadTestingScanner.jsx      # API discovery UI + mock logic
├── LoadTestingAPIList.jsx      # Display & edit discovered APIs
├── LoadTestingConfig.jsx       # Test configuration
├── LoadTestingResults.jsx      # Results display + export
└── LoadTestingHistory.jsx      # Saved configurations
```

---

## Libraries & Tools

### Currently Used (Frontend Mock)

| Library | Purpose | Version |
|---------|---------|---------|
| React | UI Framework | 18.x |
| Lucide React | Icons | Latest |
| Tailwind CSS | Styling | 3.x |

### Required for Real Implementation

| Library/Tool | Purpose | Installation |
|--------------|---------|--------------|
| **Puppeteer** | Headless browser for crawling | `npm install puppeteer` |
| **Playwright** | Alternative browser automation | `npm install playwright` |
| **mitmproxy** | HTTP/HTTPS proxy for traffic capture | `pip install mitmproxy` |
| **axios** | HTTP client for API testing | `npm install axios` |
| **cheerio** | HTML parsing | `npm install cheerio` |
| **swagger-parser** | OpenAPI spec parsing | `npm install @apidevtools/swagger-parser` |
| **har-validator** | HAR file parsing | `npm install har-validator` |

### For ML-based Detection (Advanced)

| Library | Purpose |
|---------|---------|
| TensorFlow.js | Client-side ML for pattern recognition |
| Natural | NLP for endpoint classification |
| Brain.js | Neural network for API categorization |

---

## Future Implementation Roadmap

### Phase 1: Basic Real Discovery
```
□ Implement HAR file import
□ Parse OpenAPI/Swagger specs from common paths
□ Add basic web crawling with Puppeteer
□ Capture XHR/Fetch requests during page load
```

### Phase 2: Advanced Discovery
```
□ Implement proxy-based traffic interception
□ Add JavaScript execution for SPA support
□ GraphQL introspection support
□ Form detection and parameter extraction
```

### Phase 3: Intelligent Detection
```
□ ML model for endpoint classification
□ Automatic parameter type detection
□ Authentication method detection
□ Rate limit detection
```

### Real Backend Implementation Example

```javascript
// server/services/apiDiscovery.js

const puppeteer = require('puppeteer');
const { URL } = require('url');

class APIDiscoveryService {
    constructor() {
        this.discoveredAPIs = [];
    }

    async discoverAPIs(targetUrl) {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();

        // Intercept network requests
        await page.setRequestInterception(true);

        page.on('request', (request) => {
            const url = request.url();
            const method = request.method();

            // Filter for API calls
            if (this.isAPICall(url)) {
                this.discoveredAPIs.push({
                    method,
                    endpoint: this.extractEndpoint(url),
                    params: this.extractParams(url),
                    headers: request.headers(),
                    body: request.postData()
                });
            }

            request.continue();
        });

        // Navigate and interact
        await page.goto(targetUrl, { waitUntil: 'networkidle2' });

        // Scroll to trigger lazy loading
        await this.autoScroll(page);

        // Click interactive elements
        await this.clickButtons(page);

        await browser.close();

        return this.classifyAPIs(this.discoveredAPIs);
    }

    isAPICall(url) {
        const apiPatterns = [
            /\/api\//i,
            /\/v[0-9]+\//i,
            /\.json$/i,
            /graphql/i
        ];
        return apiPatterns.some(pattern => pattern.test(url));
    }

    extractEndpoint(url) {
        const parsed = new URL(url);
        return parsed.pathname;
    }

    extractParams(url) {
        const parsed = new URL(url);
        const params = [];
        parsed.searchParams.forEach((value, key) => {
            params.push({
                name: key,
                type: this.inferType(value),
                value: value
            });
        });
        return params;
    }

    inferType(value) {
        if (!isNaN(value)) return 'number';
        if (value === 'true' || value === 'false') return 'boolean';
        if (value.includes('@')) return 'email';
        return 'string';
    }

    classifyAPIs(apis) {
        // Group by category based on endpoint patterns
        return apis.map(api => ({
            ...api,
            category: this.categorizeEndpoint(api.endpoint),
            auth: this.detectAuth(api)
        }));
    }

    categorizeEndpoint(endpoint) {
        if (/auth|login|register|session/i.test(endpoint)) return 'Authentication';
        if (/user|profile|account/i.test(endpoint)) return 'User';
        if (/bet|wager|stake/i.test(endpoint)) return 'Betting';
        if (/payment|deposit|withdraw/i.test(endpoint)) return 'Payments';
        return 'General';
    }

    detectAuth(api) {
        const headers = api.headers || {};
        if (headers['Authorization']?.startsWith('Bearer')) return 'Bearer Token';
        if (headers['X-API-Key']) return 'API Key';
        if (headers['Authorization']?.startsWith('Basic')) return 'Basic Auth';
        return 'None';
    }
}

module.exports = APIDiscoveryService;
```

---

## Summary

| Aspect | Current (Mock) | Real Implementation |
|--------|----------------|---------------------|
| **Discovery Method** | URL keyword matching | Network interception + crawling |
| **API Source** | Pre-defined static lists | Actual captured traffic |
| **Accuracy** | Template-based estimation | Real endpoint detection |
| **Backend Required** | No | Yes (Node.js + Puppeteer) |
| **Time to Scan** | Instant (simulated) | 30-120 seconds |
| **Customization** | Edit after discovery | Capture actual params/headers |

---

## Files Reference

| File | Purpose |
|------|---------|
| `LoadTestingScanner.jsx` | UI + mock discovery logic |
| `LoadTestingAPIList.jsx` | Display + edit APIs |
| `LoadTestingDashboard.jsx` | Main coordinator |
| `LoadTestingResults.jsx` | Results + export |
| `LoadTestingConfig.jsx` | Test configuration |

---

*Document Version: 1.0*
*Last Updated: January 2026*
*Author: Automation Dashboard Team*
