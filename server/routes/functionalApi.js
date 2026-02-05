const express = require('express');
const { getAvailableScripts, executeTests, stopExecution } = require('../services/functional/automationService');
const { getConfig } = require('../services/functional/configService');
const { readHistory, getHistoryByClient } = require('../config/functionalDb');
const { generatePdfReport, downloadFailedScreenshots } = require('../services/functional/fileService');

// Export a function that accepts dependencies and returns the router
module.exports = function createFunctionalApiRouter(io, automationDir) {
    const router = express.Router();

    // -- Configuration --
    // Frontend will call this first to know what inputs to render
    router.get('/config', (req, res) => {
        try {
            res.json(getConfig());
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // -- Scripts (Dynamic) --
    router.get('/scripts', (req, res) => {
        // Receives query params like ?region=ZA&suite=smoke
        try {
            const scripts = getAvailableScripts(req.query);
            res.json({ scripts });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // -- History --
    router.get('/history', (req, res) => {
        const { clientId } = req.query;
        const data = clientId ? getHistoryByClient(clientId) : readHistory();
        res.json(data.history);
    });

    router.get('/runs/latest', (req, res) => {
        const data = readHistory();
        if (data.history.length === 0) {
            return res.status(404).json({ error: 'No runs found' });
        }
        res.json(data.history[0]);
    });

    router.get('/runs/:id', (req, res) => {
        const data = readHistory();
        const run = data.history.find(r => r.runId === req.params.id);
        if (!run) return res.status(404).json({ error: 'Run not found' });
        res.json(run);
    });

    // -- Execution --
    router.post('/execute', (req, res) => {
        executeTests(req, res, io);
    });

    router.post('/stop', (req, res) => {
        stopExecution(req, res, io);
    });

    router.post('/runs/:id/rerun', (req, res) => {
        const data = readHistory();
        const originalRun = data.history.find(r => r.runId === req.params.id);

        if (!originalRun) {
            return res.status(404).json({ error: 'Run not found' });
        }

        // Pass the original configuration directly to executeTests
        req.body = originalRun.config || {};
        executeTests(req, res, io);
    });

    // -- Reports --
    router.get('/report/pdf', (req, res) => {
        const host = req.get('host');
        const port = host.split(':')[1] || 3000;
        generatePdfReport(req, res, port);
    });

    router.get('/report/screenshots', (req, res) => {
        downloadFailedScreenshots(req, res, automationDir);
    });

    return router;
};
