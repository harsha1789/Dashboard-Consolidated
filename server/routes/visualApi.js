const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const multer = require('multer');
const archiver = require('archiver');

const tester = require('../services/visualTester');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Visual Testing public directory
const VISUAL_PUBLIC_DIR = path.join(__dirname, '../visual-public');

// Test endpoint
router.post('/test', async (req, res) => {
    try {
        const { url, routes, requiresAuth, mobile, password, customHeaders } = req.body;
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        console.log(`Starting visual test for: ${url} with routes: ${routes || '/'}`);
        if (requiresAuth) {
            console.log('Authentication enabled - will perform automatic login');
        }

        const report = await tester.testWebsite(url, routes, { requiresAuth, mobile, password, customHeaders });
        res.json(report);
    } catch (error) {
        console.error('Visual test failed:', error);
        res.status(500).json({ error: error.message });
    }
});

// Reports endpoints
router.get('/reports', async (req, res) => {
    try {
        const reports = await tester.getReports();
        res.json(reports);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/reports/:id', async (req, res) => {
    try {
        const report = await tester.getReport(req.params.id);
        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }
        res.json(report);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/reports/:id/download', async (req, res) => {
    try {
        const report = await tester.getReport(req.params.id);
        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }

        const archive = archiver('zip', { zlib: { level: 9 } });

        res.attachment(`report-${req.params.id}.zip`);
        archive.pipe(res);

        // Add report JSON
        const reportPath = path.join(VISUAL_PUBLIC_DIR, 'results', `report-${req.params.id}.json`);
        if (await fs.pathExists(reportPath)) {
            archive.file(reportPath, { name: 'report.json' });
        } else {
            // Try old format
            const oldReportPath = path.join(VISUAL_PUBLIC_DIR, 'results', `report - ${req.params.id}.json`);
            if (await fs.pathExists(oldReportPath)) {
                archive.file(oldReportPath, { name: 'report.json' });
            }
        }

        // Add all screenshots from the run directory
        const runDir = path.join(VISUAL_PUBLIC_DIR, 'runs', req.params.id);
        if (await fs.pathExists(runDir)) {
            archive.directory(runDir, 'screenshots/runs');
        }

        // Add baseline screenshots for this site
        if (report.site) {
            const baselineDir = path.join(VISUAL_PUBLIC_DIR, 'baselines', report.site);
            if (await fs.pathExists(baselineDir)) {
                archive.directory(baselineDir, 'screenshots/baselines');
            }
        }

        await archive.finalize();
    } catch (error) {
        console.error('Download failed:', error);
        res.status(500).json({ error: error.message });
    }
});

router.delete('/reports/:id', async (req, res) => {
    try {
        const result = await tester.deleteReport(req.params.id);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Routes Management
router.get('/routes/:domain', async (req, res) => {
    try {
        const routesFile = path.join(VISUAL_PUBLIC_DIR, 'routes.json');
        let routesData = {};

        if (await fs.pathExists(routesFile)) {
            routesData = await fs.readJson(routesFile);
        }

        let domain = req.params.domain;
        try {
            if (domain.includes('://')) domain = new URL(domain).hostname;
        } catch (e) { }
        domain = domain.replace(/[:\\/*?"<>|]/g, '_');

        res.json(routesData[domain] || ['/']);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/routes/:domain', async (req, res) => {
    try {
        const routesFile = path.join(VISUAL_PUBLIC_DIR, 'routes.json');
        let routesData = {};

        if (await fs.pathExists(routesFile)) {
            routesData = await fs.readJson(routesFile);
        }

        let domain = req.params.domain;
        try {
            if (domain.includes('://')) domain = new URL(domain).hostname;
        } catch (e) { }
        domain = domain.replace(/[:\\/*?"<>|]/g, '_');

        const { route } = req.body;

        if (!routesData[domain]) {
            routesData[domain] = ['/'];
        }

        if (!routesData[domain].includes(route)) {
            routesData[domain].push(route);
        }

        await fs.writeJson(routesFile, routesData, { spaces: 2 });
        res.json(routesData[domain]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Baseline Management
router.get('/baselines/:domain', async (req, res) => {
    try {
        let domain = req.params.domain;
        try {
            if (domain.includes('://')) domain = new URL(domain).hostname;
        } catch (e) { }
        domain = domain.replace(/[:\\/*?"<>|]/g, '_');

        const baselineDir = path.join(VISUAL_PUBLIC_DIR, 'baselines', domain);

        if (!(await fs.pathExists(baselineDir))) {
            return res.json([]);
        }

        const files = await fs.readdir(baselineDir);
        const baselines = files.filter(f => f.endsWith('.png')).map(f => ({
            filename: f,
            path: `baselines/${domain}/${f}`
        }));

        res.json(baselines);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/baselines/upload', upload.single('image'), async (req, res) => {
    try {
        let { domain, routeName, viewport } = req.body;

        if (!req.file || !domain || !routeName || !viewport) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Sanitize domain: Extract hostname if it's a URL, and remove invalid path characters
        try {
            if (domain.includes('://')) {
                domain = new URL(domain).hostname;
            }
        } catch (e) {
            // Not a valid URL, just sanitize string
        }
        domain = domain.replace(/[:\\/*?"<>|]/g, '_');

        const baselineDir = path.join(VISUAL_PUBLIC_DIR, 'baselines', domain);
        await fs.ensureDir(baselineDir);

        const filename = `${routeName}-${viewport.toLowerCase()}-fullpage.png`;
        const destPath = path.join(baselineDir, filename);

        await fs.move(req.file.path, destPath, { overwrite: true });

        res.json({
            success: true,
            filename,
            path: `baselines/${domain}/${filename}`
        });
    } catch (error) {
        console.error('Upload failed:', error);
        res.status(500).json({ error: error.message });
    }
});

router.delete('/baselines/:domain/:filename', async (req, res) => {
    try {
        let { domain, filename } = req.params;
        try {
            if (domain.includes('://')) domain = new URL(domain).hostname;
        } catch (e) { }
        domain = domain.replace(/[:\\/*?"<>|]/g, '_');

        const filePath = path.join(VISUAL_PUBLIC_DIR, 'baselines', domain, filename);

        if (await fs.pathExists(filePath)) {
            await fs.remove(filePath);
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Baseline not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Authentication Management
router.get('/auth/:domain', async (req, res) => {
    try {
        const authFile = path.join(VISUAL_PUBLIC_DIR, 'auth.json');
        let authData = {};

        if (await fs.pathExists(authFile)) {
            authData = await fs.readJson(authFile);
        }

        let domain = req.params.domain;
        try {
            if (domain.includes('://')) domain = new URL(domain).hostname;
        } catch (e) { }
        domain = domain.replace(/[:\\/*?"<>|]/g, '_');

        res.json(authData[domain] || { requiresAuth: false, bearerToken: '', customHeaders: {} });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/auth/:domain', async (req, res) => {
    try {
        const authFile = path.join(VISUAL_PUBLIC_DIR, 'auth.json');
        let authData = {};

        if (await fs.pathExists(authFile)) {
            authData = await fs.readJson(authFile);
        }

        let domain = req.params.domain;
        try {
            if (domain.includes('://')) domain = new URL(domain).hostname;
        } catch (e) { }
        domain = domain.replace(/[:\\/*?"<>|]/g, '_');

        const { requiresAuth, bearerToken, customHeaders } = req.body;

        authData[domain] = {
            requiresAuth: requiresAuth || false,
            bearerToken: bearerToken || '',
            customHeaders: customHeaders || {}
        };

        await fs.writeJson(authFile, authData, { spaces: 2 });
        res.json(authData[domain]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/auth/:domain', async (req, res) => {
    try {
        const authFile = path.join(VISUAL_PUBLIC_DIR, 'auth.json');
        let authData = {};

        if (await fs.pathExists(authFile)) {
            authData = await fs.readJson(authFile);
        }

        let domain = req.params.domain;
        try {
            if (domain.includes('://')) domain = new URL(domain).hostname;
        } catch (e) { }
        domain = domain.replace(/[:\\/*?"<>|]/g, '_');

        if (authData[domain]) {
            delete authData[domain];
            await fs.writeJson(authFile, authData, { spaces: 2 });
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
