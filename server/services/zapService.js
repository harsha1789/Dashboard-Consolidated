/**
 * OWASP ZAP Integration Service
 *
 * This service communicates with OWASP ZAP's REST API to perform
 * Dynamic Application Security Testing (DAST) scans.
 *
 * Prerequisites:
 * - OWASP ZAP must be running with API enabled
 * - Default: http://localhost:8080
 * - Start ZAP with: zap.sh -daemon -port 8080 -config api.disablekey=true
 *   Or use API key: zap.sh -daemon -port 8080 -config api.key=your-api-key
 */

const http = require('http');
const https = require('https');

class ZapService {
    constructor(config = {}) {
        this.zapHost = config.host || process.env.ZAP_HOST || 'localhost';
        this.zapPort = config.port || process.env.ZAP_PORT || 8080;
        this.apiKey = config.apiKey || process.env.ZAP_API_KEY || '';
        this.baseUrl = `http://${this.zapHost}:${this.zapPort}`;

        // Track active scans
        this.activeScans = new Map();
    }

    /**
     * Make HTTP request to ZAP API
     */
    async zapRequest(endpoint, params = {}) {
        return new Promise((resolve, reject) => {
            // Add API key if configured
            if (this.apiKey) {
                params.apikey = this.apiKey;
            }

            const queryString = Object.entries(params)
                .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
                .join('&');

            const url = `${this.baseUrl}${endpoint}${queryString ? '?' + queryString : ''}`;

            http.get(url, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        resolve(parsed);
                    } catch (e) {
                        resolve({ raw: data });
                    }
                });
            }).on('error', (err) => {
                reject(new Error(`ZAP API request failed: ${err.message}. Is ZAP running on ${this.baseUrl}?`));
            });
        });
    }

    /**
     * Check if ZAP is running and accessible
     */
    async checkConnection() {
        try {
            const result = await this.zapRequest('/JSON/core/view/version/');
            return {
                connected: true,
                version: result.version,
                host: this.zapHost,
                port: this.zapPort
            };
        } catch (error) {
            return {
                connected: false,
                error: error.message,
                host: this.zapHost,
                port: this.zapPort
            };
        }
    }

    /**
     * Access the target URL (required before scanning)
     */
    async accessUrl(targetUrl) {
        try {
            await this.zapRequest('/JSON/core/action/accessUrl/', { url: targetUrl });
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Start Spider scan to crawl the target
     */
    async startSpider(targetUrl, options = {}) {
        try {
            const params = {
                url: targetUrl,
                maxChildren: options.maxChildren || 10,
                recurse: options.recurse !== false ? 'true' : 'false',
                subtreeOnly: options.subtreeOnly ? 'true' : 'false'
            };

            const result = await this.zapRequest('/JSON/spider/action/scan/', params);
            return {
                success: true,
                scanId: result.scan,
                type: 'spider'
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Get Spider scan progress (0-100)
     */
    async getSpiderProgress(scanId) {
        try {
            const result = await this.zapRequest('/JSON/spider/view/status/', { scanId });
            return {
                progress: parseInt(result.status) || 0,
                complete: parseInt(result.status) >= 100
            };
        } catch (error) {
            return { progress: 0, error: error.message };
        }
    }

    /**
     * Start Active Scan (performs actual vulnerability testing)
     */
    async startActiveScan(targetUrl, options = {}) {
        try {
            const params = {
                url: targetUrl,
                recurse: options.recurse !== false ? 'true' : 'false',
                inScopeOnly: options.inScopeOnly ? 'true' : 'false'
            };

            // For quick scan, limit the scan policy
            if (options.scanType === 'quick') {
                params.scanPolicyName = 'Light';
            }

            const result = await this.zapRequest('/JSON/ascan/action/scan/', params);
            return {
                success: true,
                scanId: result.scan,
                type: 'active'
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Get Active Scan progress (0-100)
     */
    async getActiveScanProgress(scanId) {
        try {
            const result = await this.zapRequest('/JSON/ascan/view/status/', { scanId });
            return {
                progress: parseInt(result.status) || 0,
                complete: parseInt(result.status) >= 100
            };
        } catch (error) {
            return { progress: 0, error: error.message };
        }
    }

    /**
     * Stop an active scan
     */
    async stopScan(scanId, type = 'active') {
        try {
            const endpoint = type === 'spider'
                ? '/JSON/spider/action/stop/'
                : '/JSON/ascan/action/stop/';

            await this.zapRequest(endpoint, { scanId });
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Get all alerts/findings for a target URL
     */
    async getAlerts(targetUrl, options = {}) {
        try {
            const params = {
                baseurl: targetUrl,
                start: options.start || 0,
                count: options.count || 100
            };

            const result = await this.zapRequest('/JSON/core/view/alerts/', params);

            // Transform ZAP alerts to our format
            const alerts = (result.alerts || []).map(alert => this.transformAlert(alert));

            return {
                success: true,
                alerts,
                total: alerts.length
            };
        } catch (error) {
            return { success: false, alerts: [], error: error.message };
        }
    }

    /**
     * Get alert summary counts by risk level
     */
    async getAlertSummary(targetUrl) {
        try {
            const result = await this.zapRequest('/JSON/core/view/alertsSummary/', { baseurl: targetUrl });

            return {
                success: true,
                summary: {
                    critical: parseInt(result.alertsSummary?.High) || 0, // ZAP uses "High" for critical
                    high: parseInt(result.alertsSummary?.Medium) || 0,
                    medium: parseInt(result.alertsSummary?.Low) || 0,
                    low: parseInt(result.alertsSummary?.Informational) || 0
                }
            };
        } catch (error) {
            return {
                success: false,
                summary: { critical: 0, high: 0, medium: 0, low: 0 },
                error: error.message
            };
        }
    }

    /**
     * Transform ZAP alert to our standardized format
     */
    transformAlert(zapAlert) {
        // Map ZAP risk levels to our severity
        const severityMap = {
            '3': 'critical',  // High
            '2': 'high',      // Medium
            '1': 'medium',    // Low
            '0': 'low'        // Informational
        };

        // Map ZAP confidence levels
        const confidenceMap = {
            '3': 'High',
            '2': 'Medium',
            '1': 'Low',
            '0': 'False Positive'
        };

        return {
            id: zapAlert.id || zapAlert.alertRef,
            severity: severityMap[zapAlert.risk] || 'low',
            confidence: confidenceMap[zapAlert.confidence] || 'Medium',
            title: zapAlert.alert || zapAlert.name,
            description: zapAlert.description,
            endpoint: zapAlert.url,
            method: zapAlert.method || 'GET',
            evidence: zapAlert.evidence || '',
            solution: zapAlert.solution,
            recommendation: zapAlert.solution,
            reference: zapAlert.reference,
            cweId: zapAlert.cweid ? `CWE-${zapAlert.cweid}` : null,
            wascId: zapAlert.wascid ? `WASC-${zapAlert.wascid}` : null,
            owasp: this.mapCweToOwasp(zapAlert.cweid),
            pluginId: zapAlert.pluginId,
            param: zapAlert.param,
            attack: zapAlert.attack,
            otherInfo: zapAlert.other
        };
    }

    /**
     * Map CWE IDs to OWASP Top 10 2021 categories
     */
    mapCweToOwasp(cweId) {
        if (!cweId) return 'Uncategorized';

        const cwe = parseInt(cweId);

        // A01:2021 - Broken Access Control
        if ([22, 23, 35, 59, 200, 201, 219, 264, 275, 276, 284, 285, 352, 359, 377, 402, 425, 441, 497, 538, 540, 548, 552, 566, 601, 639, 651, 668, 706, 862, 863, 913, 922, 1275].includes(cwe)) {
            return 'A01:2021 - Broken Access Control';
        }

        // A02:2021 - Cryptographic Failures
        if ([261, 296, 310, 319, 320, 321, 322, 323, 324, 325, 326, 327, 328, 329, 330, 331, 335, 336, 337, 338, 339, 340, 347, 523, 720, 757, 759, 760, 780, 818, 916].includes(cwe)) {
            return 'A02:2021 - Cryptographic Failures';
        }

        // A03:2021 - Injection
        if ([20, 74, 75, 77, 78, 79, 80, 83, 87, 88, 89, 90, 91, 93, 94, 95, 96, 97, 98, 99, 100, 113, 116, 138, 184, 470, 471, 564, 610, 643, 644, 652, 917].includes(cwe)) {
            return 'A03:2021 - Injection';
        }

        // A04:2021 - Insecure Design
        if ([73, 183, 209, 213, 235, 256, 257, 266, 269, 280, 311, 312, 313, 316, 419, 430, 434, 444, 451, 472, 501, 522, 525, 539, 579, 598, 602, 642, 646, 650, 653, 654, 655, 656, 657, 799, 807, 840, 841, 927, 1021, 1173].includes(cwe)) {
            return 'A04:2021 - Insecure Design';
        }

        // A05:2021 - Security Misconfiguration
        if ([2, 11, 13, 15, 16, 260, 315, 520, 526, 537, 541, 547, 611, 614, 756, 776, 942, 1004, 1032, 1174].includes(cwe)) {
            return 'A05:2021 - Security Misconfiguration';
        }

        // A06:2021 - Vulnerable and Outdated Components
        if ([937, 1035, 1104].includes(cwe)) {
            return 'A06:2021 - Vulnerable Components';
        }

        // A07:2021 - Identification and Authentication Failures
        if ([255, 259, 287, 288, 290, 294, 295, 297, 300, 302, 304, 306, 307, 346, 384, 521, 613, 620, 640, 798, 940, 1216].includes(cwe)) {
            return 'A07:2021 - Auth Failures';
        }

        // A08:2021 - Software and Data Integrity Failures
        if ([345, 353, 426, 494, 502, 565, 784, 829, 830, 915].includes(cwe)) {
            return 'A08:2021 - Integrity Failures';
        }

        // A09:2021 - Security Logging and Monitoring Failures
        if ([117, 223, 532, 778].includes(cwe)) {
            return 'A09:2021 - Logging Failures';
        }

        // A10:2021 - Server-Side Request Forgery
        if ([918].includes(cwe)) {
            return 'A10:2021 - SSRF';
        }

        return `CWE-${cwe}`;
    }

    /**
     * Run a complete DAST scan (spider + active scan)
     * Returns a scan session that can be monitored
     */
    async startFullScan(targetUrl, options = {}) {
        const scanId = `scan_${Date.now()}`;

        const scanSession = {
            id: scanId,
            targetUrl,
            options,
            status: 'initializing',
            phase: 'Initializing',
            progress: 0,
            spiderScanId: null,
            activeScanId: null,
            startTime: new Date().toISOString(),
            alerts: [],
            error: null
        };

        this.activeScans.set(scanId, scanSession);

        // Start the scan process asynchronously
        this.runScanProcess(scanId, targetUrl, options);

        return { success: true, scanId, session: scanSession };
    }

    /**
     * Internal: Run the full scan process
     */
    async runScanProcess(scanId, targetUrl, options) {
        const session = this.activeScans.get(scanId);
        if (!session) return;

        try {
            // Phase 1: Access URL
            session.phase = 'Accessing Target';
            session.status = 'running';
            await this.accessUrl(targetUrl);
            session.progress = 5;

            // Phase 2: Spider scan (if not quick API-only scan)
            if (options.scanType !== 'api') {
                session.phase = 'Crawling';
                const spiderResult = await this.startSpider(targetUrl, options);

                if (!spiderResult.success) {
                    throw new Error(`Spider failed: ${spiderResult.error}`);
                }

                session.spiderScanId = spiderResult.scanId;

                // Monitor spider progress
                while (true) {
                    const progress = await this.getSpiderProgress(session.spiderScanId);
                    session.progress = 5 + Math.floor(progress.progress * 0.25); // 5-30%

                    if (progress.complete || session.status === 'stopping') break;
                    await this.sleep(1000);
                }
            } else {
                session.progress = 30;
            }

            if (session.status === 'stopping') {
                session.status = 'stopped';
                session.phase = 'Stopped';
                return;
            }

            // Phase 3: Active scan
            session.phase = 'Active Scanning';
            const activeScanResult = await this.startActiveScan(targetUrl, options);

            if (!activeScanResult.success) {
                throw new Error(`Active scan failed: ${activeScanResult.error}`);
            }

            session.activeScanId = activeScanResult.scanId;

            // Monitor active scan progress
            while (true) {
                const progress = await this.getActiveScanProgress(session.activeScanId);
                session.progress = 30 + Math.floor(progress.progress * 0.6); // 30-90%

                if (progress.complete || session.status === 'stopping') break;
                await this.sleep(2000);
            }

            if (session.status === 'stopping') {
                session.status = 'stopped';
                session.phase = 'Stopped';
                return;
            }

            // Phase 4: Get results
            session.phase = 'Generating Report';
            session.progress = 95;

            const alertsResult = await this.getAlerts(targetUrl);
            session.alerts = alertsResult.alerts || [];

            session.progress = 100;
            session.status = 'completed';
            session.phase = 'Completed';
            session.endTime = new Date().toISOString();

        } catch (error) {
            session.status = 'failed';
            session.phase = 'Failed';
            session.error = error.message;
        }
    }

    /**
     * Get scan session status
     */
    getScanStatus(scanId) {
        const session = this.activeScans.get(scanId);
        if (!session) {
            return { success: false, error: 'Scan not found' };
        }
        return { success: true, session };
    }

    /**
     * Stop a running scan
     */
    async stopFullScan(scanId) {
        const session = this.activeScans.get(scanId);
        if (!session) {
            return { success: false, error: 'Scan not found' };
        }

        session.status = 'stopping';

        if (session.spiderScanId) {
            await this.stopScan(session.spiderScanId, 'spider');
        }
        if (session.activeScanId) {
            await this.stopScan(session.activeScanId, 'active');
        }

        return { success: true };
    }

    /**
     * Clear scan history
     */
    clearScan(scanId) {
        this.activeScans.delete(scanId);
        return { success: true };
    }

    /**
     * Get all active/recent scans
     */
    getAllScans() {
        return Array.from(this.activeScans.values());
    }

    /**
     * Helper: Sleep for ms milliseconds
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export singleton instance
const zapService = new ZapService();
module.exports = zapService;
module.exports.ZapService = ZapService;
