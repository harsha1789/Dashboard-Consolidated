const { chromium } = require('playwright');
const fs = require('fs-extra');
const path = require('path');

class SimpleVisualTester {
    constructor(baseDir) {
        this.baseDir = baseDir || path.join(__dirname, '../visual-public');
        this.baselinesDir = path.join(this.baseDir, 'baselines');
        this.resultsDir = path.join(this.baseDir, 'results');
        this.runsDir = path.join(this.baseDir, 'runs');
        this.isRunning = false;  // Concurrency guard to prevent multiple simultaneous tests
    }

    async init() {
        await fs.ensureDir(this.baselinesDir);
        await fs.ensureDir(this.resultsDir);
        await fs.ensureDir(this.runsDir);
    }

    async testWebsite(url, routes = ['/'], authConfig = {}) {
        // Prevent multiple concurrent tests
        if (this.isRunning) {
            throw new Error('A visual test is already in progress. Please wait for it to complete.');
        }
        this.isRunning = true;

        await this.init();
        const startTime = Date.now();
        const runId = Date.now().toString();

        // Setup run directory
        const currentRunDir = path.join(this.runsDir, runId);
        await fs.ensureDir(currentRunDir);

        // Launch browser with retry logic for better reliability
        let browser;
        let launchAttempts = 0;
        const maxAttempts = 3;

        while (launchAttempts < maxAttempts) {
            try {
                launchAttempts++;
                console.log(`Browser launch attempt ${launchAttempts}/${maxAttempts}...`);

                browser = await chromium.launch({
                    headless: true,
                    timeout: 60000,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-gpu',
                        '--disable-software-rasterizer'
                    ]
                });
                console.log('Browser launched successfully');
                break;
            } catch (launchError) {
                console.error(`Browser launch attempt ${launchAttempts} failed:`, launchError.message);
                if (launchAttempts >= maxAttempts) {
                    throw new Error(`Failed to launch browser after ${maxAttempts} attempts: ${launchError.message}`);
                }
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        try {
            const context = await browser.newContext({
                viewport: { width: 1920, height: 1080 },
                userAgent: 'Visual-Testing-Bot/2.0 (AI-Enhanced)'
            });

            const page = await context.newPage();

            // Perform automatic login if credentials are provided
            if (authConfig.requiresAuth && authConfig.mobile && authConfig.password) {
                console.log('Performing automatic login...');

                try {
                    // Navigate to the base URL for login
                    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

                    // Wait a bit for the page to stabilize
                    await page.waitForTimeout(3000);

                    // Fill Mobile Number
                    console.log('Filling mobile number...');
                    const mobileInput = page.getByRole('textbox', { name: 'Mobile Number' });
                    await mobileInput.fill(authConfig.mobile);

                    // Fill Password
                    console.log('Filling password...');
                    const passwordInput = page.getByRole('textbox', { name: 'Password' });
                    await passwordInput.fill(authConfig.password);

                    // Submit using Enter
                    console.log('Submitting login form...');
                    await page.keyboard.press('Enter');

                    // Wait for navigation/login to complete
                    await page.waitForTimeout(6000);

                    // Capture session storage
                    console.log('Capturing session storage...');
                    const sessionStorage = await page.evaluate(() => {
                        const storage = {};
                        for (let i = 0; i < window.sessionStorage.length; i++) {
                            const key = window.sessionStorage.key(i);
                            storage[key] = window.sessionStorage.getItem(key);
                        }
                        return storage;
                    });

                    // Capture cookies
                    console.log('Capturing cookies...');
                    const cookies = await context.cookies();

                    console.log(`Login successful! Captured ${Object.keys(sessionStorage).length} session items and ${cookies.length} cookies`);

                    // Store captured session for reuse
                    authConfig._capturedSession = sessionStorage;
                    authConfig._capturedCookies = cookies;

                } catch (loginError) {
                    console.error('Login failed:', loginError.message);
                    throw new Error(`Login failed: ${loginError.message}`);
                }
            }

            let hostname;
            try {
                hostname = new URL(url).hostname;
            } catch (e) {
                throw new Error('Invalid URL provided');
            }

            const baselineDir = path.join(this.baselinesDir, hostname);
            const isFirstRun = !(await fs.pathExists(baselineDir));
            if (isFirstRun) {
                await fs.ensureDir(baselineDir);
            }

            const results = [];

            for (const route of routes) {
                const fullUrl = new URL(route, url).toString();
                // Fix: Remove leading slash and handle empty route name
                let routeName = route === '/' ? 'home' : route.replace(/^\/+/, '').replace(/[^a-zA-Z0-9]/g, '-');
                if (!routeName) routeName = 'home';

                try {
                    console.log(`Navigating to ${fullUrl}...`);

                    const routeResults = {
                        route,
                        viewports: []
                    };

                    // Define responsive viewports
                    const viewports = [
                        { name: 'Desktop', width: 1920, height: 1080 },
                        { name: 'Tablet', width: 768, height: 1024 },
                        { name: 'Mobile', width: 375, height: 667 }
                    ];

                    for (const viewport of viewports) {
                        console.log(`Testing ${viewport.name} view (${viewport.width}x${viewport.height})...`);

                        // Set viewport
                        await page.setViewportSize({ width: viewport.width, height: viewport.height });

                        try {
                            // Navigate to the page first
                            await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

                            // Restore session storage AFTER navigation if we have captured session
                            if (authConfig._capturedSession) {
                                console.log('Restoring session storage...');
                                await page.evaluate((sessionData) => {
                                    for (const [key, value] of Object.entries(sessionData)) {
                                        window.sessionStorage.setItem(key, value);
                                    }
                                }, authConfig._capturedSession);

                                // Reload the page to apply the session
                                console.log('Reloading page with session...');
                                await page.reload({ waitUntil: 'domcontentloaded' });
                            }
                        } catch (navError) {
                            console.warn(`Navigation warning for ${fullUrl}: ${navError.message}`);
                        }

                        await page.waitForTimeout(15000); // Wait 15 seconds for complete UI stabilization

                        const viewportResult = {
                            viewport: viewport.name,
                            width: viewport.width,
                            height: viewport.height,
                            fullPage: null,
                            components: []
                        };

                        // 1. Identify Components
                        const components = await page.evaluate(() => {
                            const getRegion = (selector, name) => {
                                const el = document.querySelector(selector);
                                return el ? { name, selector } : null;
                            };

                            const getAllRegions = (selector, baseName) => {
                                const elements = document.querySelectorAll(selector);
                                return Array.from(elements).slice(0, 5).map((el, idx) => {
                                    // Generate unique selector
                                    const uniqueSelector = `${selector}:nth-of-type(${idx + 1})`;
                                    return { name: `${baseName} ${idx + 1}`, selector: uniqueSelector };
                                });
                            };

                            const candidates = [
                                // Major sections
                                getRegion('header', 'Header'),
                                getRegion('footer', 'Footer'),
                                getRegion('main', 'Main Content'),
                                getRegion('nav', 'Navigation'),
                                getRegion('.sidebar, aside', 'Sidebar'),
                                getRegion('.hero, [class*="hero"]', 'Hero Section'),
                                getRegion('.features, [id*="features"]', 'Features Section'),

                                // Forms and inputs
                                getRegion('form', 'Primary Form'),
                                ...getAllRegions('input[type="text"], input[type="email"], input[type="search"]', 'Input Field'),
                                ...getAllRegions('button, input[type="submit"], input[type="button"]', 'Button'),
                                ...getAllRegions('textarea', 'Text Area'),
                                ...getAllRegions('select', 'Dropdown'),

                                // Interactive elements
                                ...getAllRegions('a.btn, a[class*="button"]', 'Link Button'),
                                getRegion('.modal, [role="dialog"]', 'Modal'),
                                getRegion('.menu, [role="menu"]', 'Menu'),

                                // Content sections
                                ...getAllRegions('article', 'Article'),
                                ...getAllRegions('section', 'Section').slice(0, 3),
                                getRegion('.card, [class*="card"]', 'Card Component')
                            ];

                            return candidates.filter(c => c !== null);
                        });

                        // 2. Full Page processing
                        const fullPageName = `${routeName}-${viewport.name.toLowerCase()}-fullpage.png`;
                        const fullPagePath = path.join(currentRunDir, fullPageName);
                        await page.screenshot({ path: fullPagePath, fullPage: true });

                        viewportResult.fullPage = await this.processImage(
                            isFirstRun, baselineDir, currentRunDir, fullPageName, fullPagePath, 'Full Page'
                        );

                        // 3. Component Processing (only for Desktop to avoid too many screenshots)
                        if (viewport.name === 'Desktop') {
                            for (const comp of components) {
                                try {
                                    const element = await page.$(comp.selector);
                                    if (element) {
                                        const compFilename = `${routeName}-${comp.name.toLowerCase().replace(/\s+/g, '-')}.png`;
                                        const compPath = path.join(currentRunDir, compFilename);

                                        await element.screenshot({ path: compPath });

                                        const compResult = await this.processImage(
                                            isFirstRun, baselineDir, currentRunDir, compFilename, compPath, comp.name
                                        );
                                        viewportResult.components.push(compResult);
                                    }
                                } catch (e) {
                                    console.error(`Failed to capture ${comp.name}: ${e.message}`);
                                }
                            }
                        }

                        routeResults.viewports.push(viewportResult);
                    }

                    results.push(routeResults);

                } catch (e) {
                    console.error(`Error processing route ${route}:`, e);
                    results.push({ route, error: e.message });
                }
            }

            // Generate report
            const report = {
                id: runId,
                url,
                site: hostname,
                timestamp: new Date().toISOString(),
                duration: ((Date.now() - startTime) / 1000).toFixed(2) + 's',
                results
            };

            const reportPath = path.join(this.resultsDir, `report-${runId}.json`);
            await fs.writeJson(reportPath, report, { spaces: 2 });

            return report;

        } finally {
            // Reset the running flag
            this.isRunning = false;

            // Safely close browser
            if (browser) {
                try {
                    await browser.close();
                    console.log('Browser closed successfully');
                } catch (closeError) {
                    console.error('Error closing browser:', closeError.message);
                }
            }
        }
    }

    async processImage(isFirstRun, baselineDir, currentRunDir, filename, currentPath, label) {
        const baselinePath = path.join(baselineDir, filename);
        const result = {
            name: label,
            filename,
            status: 'unknown',
            baseline: `baselines/${path.basename(baselineDir)}/${filename}`,
            current: `runs/${path.basename(currentRunDir)}/${filename}`
        };

        if (isFirstRun) {
            await fs.copy(currentPath, baselinePath);
            result.status = 'baseline_created';
            return result;
        }

        if (!(await fs.pathExists(baselinePath))) {
            await fs.copy(currentPath, baselinePath);
            result.status = 'new_baseline';
            return result;
        }

        // Compare
        const diffFilename = filename.replace('.png', '-diff.png');
        const diffPath = path.join(currentRunDir, diffFilename);
        const uniqueRunId = path.basename(currentRunDir); // Need this for relative path

        try {
            const comparison = await this.compareImages(baselinePath, currentPath, diffPath);
            result.status = comparison.diffPixels === 0 ? 'pass' : 'fail';
            result.diffPixels = comparison.diffPixels;
            result.totalPixels = comparison.totalPixels;
            result.matchingPixels = comparison.matchingPixels;
            result.accuracy = comparison.accuracy;
            result.diff = `runs/${uniqueRunId}/${diffFilename}`;
        } catch (e) {
            result.status = 'error';
            result.error = e.message;
        }

        return result;
    }

    async compareImages(baselinePath, currentPath, diffPath) {
        const { execSync } = require('child_process');

        try {
            // Call Python script for accurate pixel comparison
            const pythonScript = path.join(__dirname, '../compare_images.py');

            console.log(`Comparing images:`);
            console.log(`  Baseline: ${baselinePath}`);
            console.log(`  Current: ${currentPath}`);
            console.log(`  Diff: ${diffPath}`);
            console.log(`  Python script: ${pythonScript}`);

            const command = `python "${pythonScript}" "${baselinePath}" "${currentPath}" "${diffPath}"`;

            const output = execSync(command, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
            console.log(`Python output: ${output}`);

            const result = JSON.parse(output);

            if (result.error) {
                console.error('Python comparison error:', result.error);
                return {
                    diffPixels: -1,
                    totalPixels: 0,
                    matchingPixels: 0,
                    accuracy: '0.00',
                    error: result.error
                };
            }

            console.log(`Comparison result: ${result.diffPixels} diff pixels, ${result.accuracy}% accuracy`);

            return {
                diffPixels: result.diffPixels,
                totalPixels: result.totalPixels,
                matchingPixels: result.matchingPixels,
                accuracy: result.accuracy.toFixed(2),
                dimensions: result.dimensions
            };

        } catch (error) {
            console.error('Error running Python comparison:', error.message);
            console.error('Full error:', error);
            return {
                diffPixels: -1,
                totalPixels: 0,
                matchingPixels: 0,
                accuracy: '0.00',
                error: error.message
            };
        }
    }

    async getReports() {
        await this.init();
        const files = await fs.readdir(this.resultsDir);
        const reports = [];
        for (const file of files) {
            if (file.endsWith('.json')) {
                try {
                    const data = await fs.readJson(path.join(this.resultsDir, file));
                    reports.push(data);
                } catch (e) {
                    console.error('Error reading report file:', file, e);
                }
            }
        }
        return reports.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    async getReport(id) {
        // Try new format first (report-{id}.json)
        let filePath = path.join(this.resultsDir, `report-${id}.json`);
        if (await fs.pathExists(filePath)) {
            return await fs.readJson(filePath);
        }

        // Fallback to old format (report - {id}.json with spaces)
        filePath = path.join(this.resultsDir, `report - ${id}.json`);
        if (await fs.pathExists(filePath)) {
            return await fs.readJson(filePath);
        }

        return null;
    }

    async deleteReport(id) {
        await this.init();

        // Try to find and delete the report JSON file
        let reportPath = path.join(this.resultsDir, `report-${id}.json`);
        let reportExists = await fs.pathExists(reportPath);

        if (!reportExists) {
            // Try old format
            reportPath = path.join(this.resultsDir, `report - ${id}.json`);
            reportExists = await fs.pathExists(reportPath);
        }

        if (!reportExists) {
            throw new Error('Report not found');
        }

        // Delete the report JSON file
        await fs.remove(reportPath);

        // Delete the run directory with all screenshots
        const runDir = path.join(this.runsDir, id);
        if (await fs.pathExists(runDir)) {
            await fs.remove(runDir);
        }

        // Note: We do NOT delete baselines as per requirements
        return { success: true, message: 'Report deleted successfully' };
    }
}

module.exports = new SimpleVisualTester();
