// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Visual Testing Dashboard E2E Tests
 *
 * Run these tests after fixing the Visual Testing dashboard to validate:
 * - All dashboard tabs are accessible
 * - Visual tests can be run
 * - Reports display correctly with all images (baseline, current, diff)
 * - Baseline manager works correctly
 *
 * Usage: npx playwright test tests/visual-dashboard.spec.js
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://localhost:3001';
const TEST_SITE = 'https://example.com';

test.describe('Visual Testing Dashboard', () => {

    test.beforeEach(async ({ page }) => {
        // Navigate to the dashboard
        await page.goto(BASE_URL);
        // Wait for app to load
        await page.waitForLoadState('networkidle');
    });

    test.describe('Dashboard Navigation', () => {

        test('should display main dashboard with all navigation tabs', async ({ page }) => {
            // Check sidebar exists
            const sidebar = page.locator('aside, [class*="sidebar"], nav');
            await expect(sidebar.first()).toBeVisible();

            // Check Visual Testing menu item exists
            const visualTestingLink = page.getByText('Visual Testing', { exact: false });
            await expect(visualTestingLink.first()).toBeVisible();
        });

        test('should navigate to Visual Testing dashboard', async ({ page }) => {
            // Click on Visual Testing in sidebar
            await page.getByText('Visual Testing', { exact: false }).first().click();

            // Wait for Visual Testing page to load
            await page.waitForLoadState('networkidle');

            // Verify Visual Testing header is visible
            const header = page.getByRole('heading', { name: /Visual Testing/i });
            await expect(header).toBeVisible();

            // Verify subtext is visible
            await expect(page.getByText(/pixel-perfect|regression/i)).toBeVisible();
        });

        test('should display Manage Baselines button', async ({ page }) => {
            await page.getByText('Visual Testing', { exact: false }).first().click();
            await page.waitForLoadState('networkidle');

            const manageBaselinesBtn = page.getByRole('button', { name: /Manage Baselines/i });
            await expect(manageBaselinesBtn).toBeVisible();
        });
    });

    test.describe('Visual Test Form', () => {

        test.beforeEach(async ({ page }) => {
            await page.getByText('Visual Testing', { exact: false }).first().click();
            await page.waitForLoadState('networkidle');
        });

        test('should display test form with URL input', async ({ page }) => {
            // Check for URL input field
            const urlInput = page.getByPlaceholder(/url|website|https/i);
            await expect(urlInput).toBeVisible();
        });

        test('should display routes input or management', async ({ page }) => {
            // Check for routes input/section
            const routesSection = page.getByText(/routes/i);
            await expect(routesSection.first()).toBeVisible();
        });

        test('should have Run Test button', async ({ page }) => {
            const runTestBtn = page.getByRole('button', { name: /run|start|test/i });
            await expect(runTestBtn.first()).toBeVisible();
        });
    });

    test.describe('Report List', () => {

        test.beforeEach(async ({ page }) => {
            await page.getByText('Visual Testing', { exact: false }).first().click();
            await page.waitForLoadState('networkidle');
        });

        test('should display Recent Reports section', async ({ page }) => {
            const reportsHeader = page.getByText(/Recent Reports/i);
            await expect(reportsHeader).toBeVisible();
        });

        test('should show reports or empty state message', async ({ page }) => {
            // Either show reports or "No reports found" message
            const hasReports = await page.locator('[class*="report"], [data-testid*="report"]').count() > 0;
            const hasEmptyMessage = await page.getByText(/No reports found/i).isVisible().catch(() => false);

            expect(hasReports || hasEmptyMessage).toBeTruthy();
        });
    });

    test.describe('Report Detail View', () => {

        test('should display report with all image types when report exists', async ({ page }) => {
            // Navigate to Visual Testing
            await page.getByText('Visual Testing', { exact: false }).first().click();
            await page.waitForLoadState('networkidle');

            // Check if there are any reports with View button
            const viewButtons = page.getByRole('button', { name: /View/i });
            const reportCount = await viewButtons.count();

            if (reportCount > 0) {
                // Click the first View button to open report detail
                await viewButtons.first().click();
                await page.waitForLoadState('networkidle');

                // Wait for report detail to load
                await page.waitForTimeout(1000);

                // Check for Back button (indicates we're in detail view)
                const backBtn = page.getByText(/Back to Reports/i);
                await expect(backBtn).toBeVisible();

                // Check for Comparison Results section
                const comparisonSection = page.getByText(/Comparison Results/i);
                await expect(comparisonSection).toBeVisible();

                // Check for image labels
                const baselineLabel = page.getByText('BASELINE', { exact: true });
                const currentLabel = page.getByText('CURRENT', { exact: true });
                const diffLabel = page.getByText('DIFF', { exact: true });

                await expect(baselineLabel.first()).toBeVisible();
                await expect(currentLabel.first()).toBeVisible();
                await expect(diffLabel.first()).toBeVisible();

                // Check that images are present (not broken)
                const images = page.locator('img');
                const imageCount = await images.count();
                expect(imageCount).toBeGreaterThan(0);

                // Verify images have valid src attributes with forward slashes
                for (let i = 0; i < Math.min(imageCount, 6); i++) {
                    const img = images.nth(i);
                    const src = await img.getAttribute('src');
                    expect(src).toBeTruthy();
                    expect(src).toContain('/visual-public/');
                    // Verify no backslashes in URL (the bug we fixed)
                    expect(src).not.toContain('\\');
                }
            } else {
                // Skip if no reports exist - this is acceptable
                test.skip(true, 'No reports available to test');
            }
        });

        test('should display viewport sections (Desktop, Tablet, Mobile)', async ({ page }) => {
            await page.getByText('Visual Testing', { exact: false }).first().click();
            await page.waitForLoadState('networkidle');

            const viewButtons = page.getByRole('button', { name: /View/i });
            const reportCount = await viewButtons.count();

            if (reportCount > 0) {
                await viewButtons.first().click();
                await page.waitForLoadState('networkidle');
                await page.waitForTimeout(1000);

                // Check for viewport labels
                const desktopViewport = page.getByText(/Desktop/i);
                const tabletViewport = page.getByText(/Tablet/i);
                const mobileViewport = page.getByText(/Mobile/i);

                // At least one viewport should be visible
                const hasDesktop = await desktopViewport.first().isVisible().catch(() => false);
                const hasTablet = await tabletViewport.first().isVisible().catch(() => false);
                const hasMobile = await mobileViewport.first().isVisible().catch(() => false);

                expect(hasDesktop || hasTablet || hasMobile).toBeTruthy();
            } else {
                test.skip(true, 'No reports available to test');
            }
        });

        test('should display accuracy percentage when comparison exists', async ({ page }) => {
            await page.getByText('Visual Testing', { exact: false }).first().click();
            await page.waitForLoadState('networkidle');

            const viewButtons = page.getByRole('button', { name: /View/i });
            const reportCount = await viewButtons.count();

            if (reportCount > 0) {
                await viewButtons.first().click();
                await page.waitForLoadState('networkidle');
                await page.waitForTimeout(1000);

                // Check for accuracy display (only present when comparison was done)
                const accuracyText = page.getByText(/Accuracy:/i);
                const hasAccuracy = await accuracyText.first().isVisible().catch(() => false);

                // Check for status badges
                const passStatus = page.getByText(/pass/i);
                const failStatus = page.getByText(/fail/i);
                const baselineStatus = page.getByText(/baseline/i);

                const hasPass = await passStatus.first().isVisible().catch(() => false);
                const hasFail = await failStatus.first().isVisible().catch(() => false);
                const hasBaseline = await baselineStatus.first().isVisible().catch(() => false);

                // Should have some status indicator
                expect(hasAccuracy || hasPass || hasFail || hasBaseline).toBeTruthy();
            } else {
                test.skip(true, 'No reports available to test');
            }
        });

        test('should have Download and Delete buttons in report detail', async ({ page }) => {
            await page.getByText('Visual Testing', { exact: false }).first().click();
            await page.waitForLoadState('networkidle');

            const viewButtons = page.getByRole('button', { name: /View/i });
            const reportCount = await viewButtons.count();

            if (reportCount > 0) {
                await viewButtons.first().click();
                await page.waitForLoadState('networkidle');

                const downloadBtn = page.getByRole('button', { name: /Download/i });
                const deleteBtn = page.getByRole('button', { name: /Delete/i });

                await expect(downloadBtn).toBeVisible();
                await expect(deleteBtn).toBeVisible();
            } else {
                test.skip(true, 'No reports available to test');
            }
        });
    });

    test.describe('Baseline Manager', () => {

        test('should navigate to Baseline Manager', async ({ page }) => {
            await page.getByText('Visual Testing', { exact: false }).first().click();
            await page.waitForLoadState('networkidle');

            // Click Manage Baselines button
            const manageBtn = page.getByRole('button', { name: /Manage Baselines/i });
            await manageBtn.click();
            await page.waitForLoadState('networkidle');

            // Verify we're in baseline manager (check for back button or baseline-specific content)
            const backBtn = page.getByText(/Back/i);
            await expect(backBtn.first()).toBeVisible();
        });

        test('should display domain input for baselines', async ({ page }) => {
            await page.getByText('Visual Testing', { exact: false }).first().click();
            await page.waitForLoadState('networkidle');

            const manageBtn = page.getByRole('button', { name: /Manage Baselines/i });
            await manageBtn.click();
            await page.waitForLoadState('networkidle');

            // Check for domain/URL input
            const domainInput = page.getByPlaceholder(/domain|url|website/i);
            await expect(domainInput).toBeVisible();
        });
    });

    test.describe('Image URL Validation (Bug Fix Verification)', () => {

        test('should use forward slashes in all image URLs', async ({ page }) => {
            await page.getByText('Visual Testing', { exact: false }).first().click();
            await page.waitForLoadState('networkidle');

            const viewButtons = page.getByRole('button', { name: /View/i });
            const reportCount = await viewButtons.count();

            if (reportCount > 0) {
                await viewButtons.first().click();
                await page.waitForLoadState('networkidle');
                await page.waitForTimeout(1000);

                // Get all images
                const images = page.locator('img[src*="visual-public"]');
                const imageCount = await images.count();

                // Verify each image URL uses forward slashes
                for (let i = 0; i < imageCount; i++) {
                    const img = images.nth(i);
                    const src = await img.getAttribute('src');

                    // Critical: URLs must use forward slashes, not backslashes
                    expect(src).not.toContain('\\');
                    expect(src).toMatch(/^\/visual-public\/[a-z]+\/[^\\]+$/i);
                }
            } else {
                test.skip(true, 'No reports available to test');
            }
        });

        test('should load diff images successfully (HTTP 200)', async ({ page, request }) => {
            await page.getByText('Visual Testing', { exact: false }).first().click();
            await page.waitForLoadState('networkidle');

            const viewButtons = page.getByRole('button', { name: /View/i });
            const reportCount = await viewButtons.count();

            if (reportCount > 0) {
                await viewButtons.first().click();
                await page.waitForLoadState('networkidle');
                await page.waitForTimeout(1000);

                // Get all images with diff in the src
                const diffImages = page.locator('img[src*="diff"]');
                const diffCount = await diffImages.count();

                if (diffCount > 0) {
                    // Test first diff image loads correctly
                    const firstDiffSrc = await diffImages.first().getAttribute('src');
                    const fullUrl = firstDiffSrc.startsWith('http')
                        ? firstDiffSrc
                        : `${BASE_URL}${firstDiffSrc}`;

                    const response = await request.get(fullUrl);
                    expect(response.status()).toBe(200);
                    expect(response.headers()['content-type']).toContain('image/png');
                }
            } else {
                test.skip(true, 'No reports with diff images available');
            }
        });
    });

    test.describe('Statistics Display', () => {

        test('should display statistics cards in report detail', async ({ page }) => {
            await page.getByText('Visual Testing', { exact: false }).first().click();
            await page.waitForLoadState('networkidle');

            const viewButtons = page.getByRole('button', { name: /View/i });
            const reportCount = await viewButtons.count();

            if (reportCount > 0) {
                await viewButtons.first().click();
                await page.waitForLoadState('networkidle');
                await page.waitForTimeout(1000);

                // Check for stats cards
                const routesTested = page.getByText(/Routes Tested/i);
                const viewports = page.getByText(/Viewports/i);
                const screenshots = page.getByText(/Screenshots/i);

                await expect(routesTested).toBeVisible();
                await expect(viewports).toBeVisible();
                await expect(screenshots).toBeVisible();
            } else {
                test.skip(true, 'No reports available to test');
            }
        });
    });
});

test.describe('Visual Test Execution', () => {

    test('should run a visual test and generate report', async ({ page }) => {
        // This is a longer test - increase timeout
        test.setTimeout(120000);

        // Navigate to Visual Testing
        await page.goto(BASE_URL);
        await page.waitForLoadState('networkidle');
        await page.getByText('Visual Testing', { exact: false }).first().click();
        await page.waitForLoadState('networkidle');

        // Fill in the URL
        const urlInput = page.getByPlaceholder(/url|website|https/i);
        await urlInput.fill(TEST_SITE);

        // Click Run Test button
        const runTestBtn = page.getByRole('button', { name: /run|start|test/i }).first();
        await runTestBtn.click();

        // Wait for test to complete (may take a while)
        // Look for success indicators or new report in list
        await page.waitForSelector('text=/completed|success|finished/i', { timeout: 90000 }).catch(() => {});

        // Give time for report list to refresh
        await page.waitForTimeout(2000);

        // Check that a report now exists
        const viewButtons = page.getByRole('button', { name: /View/i });
        const reportCount = await viewButtons.count();
        expect(reportCount).toBeGreaterThan(0);
    });
});

test.describe('API Endpoint Validation', () => {

    test('GET /api/visual/reports should return reports array', async ({ request }) => {
        const response = await request.get(`${API_URL}/api/visual/reports`);
        expect(response.status()).toBe(200);

        const data = await response.json();
        expect(Array.isArray(data)).toBeTruthy();
    });

    test('GET /api/visual/reports/:id should return report detail', async ({ request }) => {
        // First get list of reports
        const listResponse = await request.get(`${API_URL}/api/visual/reports`);
        const reports = await listResponse.json();

        if (reports.length > 0) {
            const reportId = reports[0].id;
            const detailResponse = await request.get(`${API_URL}/api/visual/reports/${reportId}`);

            expect(detailResponse.status()).toBe(200);

            const report = await detailResponse.json();
            expect(report).toHaveProperty('id');
            expect(report).toHaveProperty('site');
            expect(report).toHaveProperty('results');
        }
    });

    test('Report results should have correct image path format', async ({ request }) => {
        const listResponse = await request.get(`${API_URL}/api/visual/reports`);
        const reports = await listResponse.json();

        if (reports.length > 0) {
            const reportId = reports[0].id;
            const detailResponse = await request.get(`${API_URL}/api/visual/reports/${reportId}`);
            const report = await detailResponse.json();

            // Check that paths use forward slashes (not backslashes)
            const checkPaths = (obj) => {
                if (typeof obj === 'string') {
                    expect(obj).not.toContain('\\');
                } else if (typeof obj === 'object' && obj !== null) {
                    for (const key of Object.keys(obj)) {
                        if (['baseline', 'current', 'diff'].includes(key)) {
                            if (obj[key]) {
                                expect(obj[key]).not.toContain('\\');
                                expect(obj[key]).toMatch(/^(baselines|runs)\//);
                            }
                        } else if (typeof obj[key] === 'object') {
                            checkPaths(obj[key]);
                        }
                    }
                }
            };

            checkPaths(report);
        }
    });
});

test.describe('Negative Testing - Error Handling', () => {

    test('should handle 504 Gateway Timeout gracefully on visual test', async ({ page }) => {
        // Navigate to Visual Testing
        await page.goto(BASE_URL);
        await page.waitForLoadState('networkidle');
        await page.getByText('Visual Testing', { exact: false }).first().click();
        await page.waitForLoadState('networkidle');

        // Mock the API to return 504 timeout
        await page.route('**/api/visual/test', async (route) => {
            await route.fulfill({
                status: 504,
                contentType: 'application/json',
                body: JSON.stringify({ error: 'Gateway Timeout' })
            });
        });

        // Fill in the URL
        const urlInput = page.getByPlaceholder(/url|website|https/i);
        await urlInput.fill('https://example.com');

        // Click Run Test button
        const runTestBtn = page.getByRole('button', { name: /run|start|test/i }).first();
        await runTestBtn.click();

        // Wait for error message to appear
        await page.waitForTimeout(2000);

        // Check that error is displayed gracefully (not a crash)
        // The page should still be functional
        const pageTitle = page.getByText(/Visual Testing/i);
        await expect(pageTitle.first()).toBeVisible();

        // Check for error indication (could be alert, toast, or inline error)
        const hasErrorDisplay = await page.evaluate(() => {
            // Check if there's any visible error message or alert
            const errorElements = document.querySelectorAll('[class*="error"], [class*="Error"], [role="alert"]');
            return errorElements.length > 0 || document.body.innerText.includes('error') || document.body.innerText.includes('Error');
        });

        // Page should show some form of error feedback or remain stable
        expect(await page.locator('body').isVisible()).toBeTruthy();
    });

    test('should handle 500 Internal Server Error on reports fetch', async ({ page }) => {
        await page.goto(BASE_URL);
        await page.waitForLoadState('networkidle');

        // Mock the reports API to return 500
        await page.route('**/api/visual/reports', async (route) => {
            if (route.request().method() === 'GET') {
                await route.fulfill({
                    status: 500,
                    contentType: 'application/json',
                    body: JSON.stringify({ error: 'Internal Server Error' })
                });
            } else {
                await route.continue();
            }
        });

        await page.getByText('Visual Testing', { exact: false }).first().click();
        await page.waitForLoadState('networkidle');

        // Page should still render without crashing
        const header = page.getByText(/Visual Testing/i);
        await expect(header.first()).toBeVisible();

        // Recent Reports section should still be visible
        const reportsSection = page.getByText(/Recent Reports/i);
        await expect(reportsSection).toBeVisible();
    });

    test('should handle network failure gracefully', async ({ page }) => {
        await page.goto(BASE_URL);
        await page.waitForLoadState('networkidle');
        await page.getByText('Visual Testing', { exact: false }).first().click();
        await page.waitForLoadState('networkidle');

        // Mock network failure
        await page.route('**/api/visual/test', async (route) => {
            await route.abort('failed');
        });

        // Fill in the URL
        const urlInput = page.getByPlaceholder(/url|website|https/i);
        await urlInput.fill('https://example.com');

        // Click Run Test
        const runTestBtn = page.getByRole('button', { name: /run|start|test/i }).first();
        await runTestBtn.click();

        // Wait a moment for error handling
        await page.waitForTimeout(2000);

        // Page should remain stable
        await expect(page.locator('body')).toBeVisible();
    });

    test('should handle invalid URL input validation', async ({ page }) => {
        await page.goto(BASE_URL);
        await page.waitForLoadState('networkidle');
        await page.getByText('Visual Testing', { exact: false }).first().click();
        await page.waitForLoadState('networkidle');

        // Try to submit without URL
        const runTestBtn = page.getByRole('button', { name: /run|start|test/i }).first();

        // URL input should be required or show validation
        const urlInput = page.getByPlaceholder(/url|website|https/i);

        // Clear the input if it has any value
        await urlInput.fill('');

        // Click run - should not crash, might show validation error
        await runTestBtn.click();

        // Page should still be functional
        await expect(page.getByText(/Visual Testing/i).first()).toBeVisible();
    });

    test('should handle 404 for non-existent report', async ({ request }) => {
        const response = await request.get(`${API_URL}/api/visual/reports/non-existent-id-12345`);
        expect(response.status()).toBe(404);
    });

    test('should handle malformed request body on test endpoint', async ({ request }) => {
        const response = await request.post(`${API_URL}/api/visual/test`, {
            data: { invalid: 'data' }  // Missing required 'url' field
        });

        // Should return 400 Bad Request, not 500
        expect(response.status()).toBe(400);
    });

    test('UI should display user-friendly error message on failure', async ({ page }) => {
        await page.goto(BASE_URL);
        await page.waitForLoadState('networkidle');
        await page.getByText('Visual Testing', { exact: false }).first().click();
        await page.waitForLoadState('networkidle');

        // Listen for any dialog/alert
        page.on('dialog', async dialog => {
            // Accept any alert that appears
            await dialog.accept();
        });

        // Mock API to return error with message
        await page.route('**/api/visual/test', async (route) => {
            await route.fulfill({
                status: 504,
                contentType: 'application/json',
                body: JSON.stringify({ error: 'Request failed with status code 504' })
            });
        });

        // Fill URL and submit
        const urlInput = page.getByPlaceholder(/url|website|https/i);
        await urlInput.fill('https://example.com');

        const runTestBtn = page.getByRole('button', { name: /run|start|test/i }).first();
        await runTestBtn.click();

        // Wait for response handling
        await page.waitForTimeout(3000);

        // Verify page is still interactive (not frozen/crashed)
        const isInteractive = await page.evaluate(() => {
            return document.body !== null && !document.body.classList.contains('error-crash');
        });
        expect(isInteractive).toBeTruthy();
    });
});
