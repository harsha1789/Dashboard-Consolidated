/**
 * Security Testing API Routes
 *
 * Provides endpoints for:
 * - DAST (Dynamic Application Security Testing) using OWASP ZAP
 * - SAST (Static Application Security Testing) using Semgrep
 * - SCA (Software Composition Analysis) using npm audit
 */

const express = require('express');
const zapService = require('../services/zapService');
const sastService = require('../services/sastService');
const scaService = require('../services/scaService');
const aiSecurityService = require('../services/aiSecurityService');

module.exports = function createSecurityApiRouter(io) {
    const router = express.Router();

    /**
     * GET /api/security/status
     * Check ZAP connection status
     */
    router.get('/status', async (req, res) => {
        try {
            const status = await zapService.checkConnection();
            res.json(status);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * POST /api/security/dast/scan
     * Start a new DAST scan
     * Body: { targetUrl, scanType: 'quick'|'full'|'api', authenticated: boolean }
     */
    router.post('/dast/scan', async (req, res) => {
        try {
            const { targetUrl, scanType = 'full', authenticated = false, credentials } = req.body;

            if (!targetUrl) {
                return res.status(400).json({ error: 'Target URL is required' });
            }

            // Validate URL format
            try {
                new URL(targetUrl);
            } catch (e) {
                return res.status(400).json({ error: 'Invalid URL format' });
            }

            // Check ZAP connection first
            const zapStatus = await zapService.checkConnection();
            if (!zapStatus.connected) {
                return res.status(503).json({
                    error: 'OWASP ZAP is not running or not accessible',
                    details: zapStatus.error,
                    help: 'Start ZAP with: zap.sh -daemon -port 8080 -config api.disablekey=true'
                });
            }

            // Start the scan
            const result = await zapService.startFullScan(targetUrl, {
                scanType,
                authenticated,
                credentials
            });

            if (!result.success) {
                return res.status(500).json({ error: result.error });
            }

            // Emit scan started event via Socket.IO
            if (io) {
                io.emit('dast:scanStarted', {
                    scanId: result.scanId,
                    targetUrl,
                    scanType
                });
            }

            res.json({
                success: true,
                scanId: result.scanId,
                message: 'DAST scan started successfully'
            });

        } catch (error) {
            console.error('DAST scan error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * GET /api/security/dast/scan/:scanId
     * Get scan status and progress
     */
    router.get('/dast/scan/:scanId', async (req, res) => {
        try {
            const { scanId } = req.params;
            const result = zapService.getScanStatus(scanId);

            if (!result.success) {
                return res.status(404).json({ error: result.error });
            }

            res.json(result.session);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * POST /api/security/dast/scan/:scanId/stop
     * Stop a running scan
     */
    router.post('/dast/scan/:scanId/stop', async (req, res) => {
        try {
            const { scanId } = req.params;
            const result = await zapService.stopFullScan(scanId);

            if (!result.success) {
                return res.status(404).json({ error: result.error });
            }

            // Emit scan stopped event
            if (io) {
                io.emit('dast:scanStopped', { scanId });
            }

            res.json({ success: true, message: 'Scan stop requested' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * GET /api/security/dast/scans
     * Get all active/recent scans
     */
    router.get('/dast/scans', (req, res) => {
        try {
            const scans = zapService.getAllScans();
            res.json({ scans });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * DELETE /api/security/dast/scan/:scanId
     * Clear a scan from history
     */
    router.delete('/dast/scan/:scanId', (req, res) => {
        try {
            const { scanId } = req.params;
            zapService.clearScan(scanId);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * GET /api/security/dast/alerts
     * Get alerts for a target URL (direct ZAP query)
     */
    router.get('/dast/alerts', async (req, res) => {
        try {
            const { targetUrl, start = 0, count = 100 } = req.query;

            if (!targetUrl) {
                return res.status(400).json({ error: 'Target URL is required' });
            }

            const result = await zapService.getAlerts(targetUrl, {
                start: parseInt(start),
                count: parseInt(count)
            });

            if (!result.success) {
                return res.status(500).json({ error: result.error });
            }

            res.json({
                alerts: result.alerts,
                total: result.total
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * GET /api/security/dast/summary
     * Get alert summary for a target URL
     */
    router.get('/dast/summary', async (req, res) => {
        try {
            const { targetUrl } = req.query;

            if (!targetUrl) {
                return res.status(400).json({ error: 'Target URL is required' });
            }

            const result = await zapService.getAlertSummary(targetUrl);

            if (!result.success) {
                return res.status(500).json({ error: result.error });
            }

            res.json(result.summary);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * WebSocket event emitter for real-time scan updates
     * Call this periodically or hook into zapService events
     */
    const startScanUpdates = () => {
        if (!io) return;

        setInterval(() => {
            const scans = zapService.getAllScans();
            scans.forEach(scan => {
                if (scan.status === 'running') {
                    io.emit('dast:scanProgress', {
                        scanId: scan.id,
                        phase: scan.phase,
                        progress: scan.progress,
                        status: scan.status
                    });
                }
            });
        }, 2000);
    };

    // Start background updates if io is available
    if (io) {
        startScanUpdates();
    }

    // ==================== SAST ROUTES ====================

    /**
     * GET /api/security/sast/status
     * Get SAST service status
     */
    router.get('/sast/status', async (req, res) => {
        try {
            const status = await sastService.getStatus();
            res.json(status);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * POST /api/security/sast/scan
     * Start a SAST scan on provided code
     * Body: { code, filename, language }
     */
    router.post('/sast/scan', async (req, res) => {
        try {
            const { code, filename, language } = req.body;

            if (!code) {
                return res.status(400).json({ error: 'Code is required' });
            }

            const result = await sastService.startScan({
                code,
                filename: filename || 'code.js',
                language
            });

            if (!result.success) {
                return res.status(500).json({ error: result.error });
            }

            // Emit scan started event
            if (io) {
                io.emit('sast:scanStarted', { scanId: result.scanId });
            }

            res.json({
                success: true,
                scanId: result.scanId,
                message: 'SAST scan started successfully'
            });

        } catch (error) {
            console.error('SAST scan error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * GET /api/security/sast/scan/:scanId
     * Get SAST scan status
     */
    router.get('/sast/scan/:scanId', (req, res) => {
        try {
            const { scanId } = req.params;
            const result = sastService.getScanStatus(scanId);

            if (!result.success) {
                return res.status(404).json({ error: result.error });
            }

            res.json(result.session);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * GET /api/security/sast/scans
     * Get all SAST scans
     */
    router.get('/sast/scans', (req, res) => {
        try {
            const scans = sastService.getAllScans();
            res.json({ scans });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * DELETE /api/security/sast/scan/:scanId
     * Clear a SAST scan
     */
    router.delete('/sast/scan/:scanId', (req, res) => {
        try {
            const { scanId } = req.params;
            sastService.clearScan(scanId);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // ==================== SCA ROUTES ====================

    /**
     * GET /api/security/sca/status
     * Get SCA service status
     */
    router.get('/sca/status', async (req, res) => {
        try {
            const status = await scaService.getStatus();
            res.json(status);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * POST /api/security/sca/scan
     * Start an SCA scan on provided manifest
     * Body: { content, filename, type }
     */
    router.post('/sca/scan', async (req, res) => {
        try {
            const { content, filename, type } = req.body;

            if (!content) {
                return res.status(400).json({ error: 'Manifest content is required' });
            }

            const result = await scaService.startScan({
                content,
                filename: filename || 'package.json',
                type
            });

            if (!result.success) {
                return res.status(500).json({ error: result.error });
            }

            // Emit scan started event
            if (io) {
                io.emit('sca:scanStarted', { scanId: result.scanId });
            }

            res.json({
                success: true,
                scanId: result.scanId,
                message: 'SCA scan started successfully'
            });

        } catch (error) {
            console.error('SCA scan error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * GET /api/security/sca/scan/:scanId
     * Get SCA scan status
     */
    router.get('/sca/scan/:scanId', (req, res) => {
        try {
            const { scanId } = req.params;
            const result = scaService.getScanStatus(scanId);

            if (!result.success) {
                return res.status(404).json({ error: result.error });
            }

            res.json(result.session);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * GET /api/security/sca/scans
     * Get all SCA scans
     */
    router.get('/sca/scans', (req, res) => {
        try {
            const scans = scaService.getAllScans();
            res.json({ scans });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * DELETE /api/security/sca/scan/:scanId
     * Clear an SCA scan
     */
    router.delete('/sca/scan/:scanId', (req, res) => {
        try {
            const { scanId } = req.params;
            scaService.clearScan(scanId);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * GET /api/security/sca/remediation/:scanId
     * Get remediation command for an SCA scan
     */
    router.get('/sca/remediation/:scanId', (req, res) => {
        try {
            const { scanId } = req.params;
            const result = scaService.getScanStatus(scanId);

            if (!result.success) {
                return res.status(404).json({ error: result.error });
            }

            const command = scaService.generateRemediationCommand(result.session);
            res.json({ command });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // ==================== AI SECURITY ROUTES ====================

    /**
     * GET /api/security/ai/status
     * Get AI security service status
     */
    router.get('/ai/status', (req, res) => {
        try {
            const status = aiSecurityService.getStatus();
            res.json(status);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * POST /api/security/ai/analyze-code
     * AI-powered code security analysis
     * Body: { code, language }
     */
    router.post('/ai/analyze-code', async (req, res) => {
        try {
            const { code, language = 'javascript' } = req.body;

            if (!code) {
                return res.status(400).json({ error: 'Code is required' });
            }

            if (!aiSecurityService.isConfigured()) {
                return res.status(503).json({
                    error: 'AI service not configured',
                    help: 'Set OPENROUTER_API_KEY in server/.env file'
                });
            }

            const result = await aiSecurityService.analyzeCode(code, language);
            res.json({ success: true, ...result });

        } catch (error) {
            console.error('AI code analysis error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * POST /api/security/ai/threat-model
     * AI-powered threat modeling
     * Body: { description, architecture }
     */
    router.post('/ai/threat-model', async (req, res) => {
        try {
            const { description, architecture } = req.body;

            if (!description) {
                return res.status(400).json({ error: 'Application description is required' });
            }

            if (!aiSecurityService.isConfigured()) {
                return res.status(503).json({
                    error: 'AI service not configured',
                    help: 'Set OPENROUTER_API_KEY in server/.env file'
                });
            }

            const result = await aiSecurityService.generateThreatModel(description, architecture);
            res.json({ success: true, ...result });

        } catch (error) {
            console.error('AI threat model error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * POST /api/security/ai/analyze-api
     * AI-powered API security analysis
     * Body: { apiSpec }
     */
    router.post('/ai/analyze-api', async (req, res) => {
        try {
            const { apiSpec } = req.body;

            if (!apiSpec) {
                return res.status(400).json({ error: 'API specification is required' });
            }

            if (!aiSecurityService.isConfigured()) {
                return res.status(503).json({
                    error: 'AI service not configured',
                    help: 'Set OPENROUTER_API_KEY in server/.env file'
                });
            }

            const result = await aiSecurityService.analyzeAPI(apiSpec);
            res.json({ success: true, ...result });

        } catch (error) {
            console.error('AI API analysis error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * POST /api/security/ai/remediation
     * Get AI-powered remediation advice
     * Body: { finding }
     */
    router.post('/ai/remediation', async (req, res) => {
        try {
            const { finding } = req.body;

            if (!finding) {
                return res.status(400).json({ error: 'Finding is required' });
            }

            if (!aiSecurityService.isConfigured()) {
                return res.status(503).json({
                    error: 'AI service not configured',
                    help: 'Set OPENROUTER_API_KEY in server/.env file'
                });
            }

            const result = await aiSecurityService.getRemediationAdvice(finding);
            res.json({ success: true, ...result });

        } catch (error) {
            console.error('AI remediation error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    return router;
};
