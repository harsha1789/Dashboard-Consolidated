// Load environment variables
require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const createApiRouter = require('./routes/api');
const visualApiRouter = require('./routes/visualApi');
const createFunctionalApiRouter = require('./routes/functionalApi');
const createSecurityApiRouter = require('./routes/securityApi');
const createLoadTestRouter = require('./routes/loadTestApi');
const clientsApiRouter = require('./routes/clientsApi');
const usersApiRouter = require('./routes/usersApi');
const { loadConfig: loadFunctionalConfig } = require('./services/functional/configService');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// --- Configuration ---
const AUTOMATION_DIR = path.resolve(__dirname, '../../Betway-Automation');
// Functional Testing uses the same automation directory (config-driven)
const FUNCTIONAL_AUTOMATION_DIR = AUTOMATION_DIR;
const PORT = process.env.PORT || 3001;

// Load Functional Testing configuration if directory exists
try {
    const fs = require('fs');
    if (fs.existsSync(FUNCTIONAL_AUTOMATION_DIR)) {
        loadFunctionalConfig(FUNCTIONAL_AUTOMATION_DIR);
        console.log(`Functional Automation Directory: ${FUNCTIONAL_AUTOMATION_DIR}`);
    } else {
        console.log(`Functional Automation Directory not found: ${FUNCTIONAL_AUTOMATION_DIR}`);
        console.log('Functional Testing features will be limited until configured.');
    }
} catch (e) {
    console.error('Failed to load functional config:', e.message);
}

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Routes ---
// Mount API routes, injecting dependencies (io, automationDir)
app.use('/api', createApiRouter(io, AUTOMATION_DIR));

// Mount Visual Testing API routes
app.use('/api/visual', visualApiRouter);

// Mount Functional Testing API routes
app.use('/api/functional', createFunctionalApiRouter(io, FUNCTIONAL_AUTOMATION_DIR));

// Mount Security Testing API routes (OWASP ZAP integration)
app.use('/api/security', createSecurityApiRouter(io));

// Mount Load Testing API routes (API Discovery with Playwright)
app.use('/api/loadtest', createLoadTestRouter(io));

// Mount Clients API routes (Multi-client/project management)
app.use('/api/clients', clientsApiRouter);

// Mount Users API routes (User management and authentication)
app.use('/api/users', usersApiRouter);

// Serve Visual Testing static files (screenshots, baselines)
app.use('/visual-public', express.static(path.join(__dirname, 'visual-public')));

// Serve Functional Testing Playwright Reports
app.use('/functional-report', express.static(path.join(FUNCTIONAL_AUTOMATION_DIR, 'playwright-report')));

// Serve Functional Testing static source files (for Allure reports)
app.use('/functional-source', express.static(FUNCTIONAL_AUTOMATION_DIR));

// Serve Playwright Reports
app.use('/report', express.static(path.join(AUTOMATION_DIR, 'playwright-report')));

// Serve Frontend (Built React App from client2)
app.use(express.static(path.join(__dirname, '../client2/dist')));

// Fallback to index.html for React Router
app.use((req, res) => {
    // Check if request is for API, ignore (let 404 propagate if not matched above)
    // Actually, if it didn't match /api above, it hits here.
    if (req.path.startsWith('/api') || req.path.startsWith('/report')) {
        return res.status(404).send('Not Found');
    }
    res.sendFile(path.join(__dirname, '../client2/dist/index.html'));
});

// --- Start Server ---
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    console.log(`Automation Directory: ${AUTOMATION_DIR}`);
});
