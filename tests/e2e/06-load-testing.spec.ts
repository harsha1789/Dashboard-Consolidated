import { test, expect } from '@playwright/test';

// Helper function to login
async function login(page) {
    await page.goto('/');
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();

    await page.locator('button:has-text("Choose your role...")').click();
    await page.locator('button:has-text("Developer")').first().click();
    await page.locator('input[type="password"]').fill('Zensar');
    await page.locator('button:has-text("Sign In")').click();

    await expect(page.locator('nav >> text=Dashboard')).toBeVisible({ timeout: 5000 });
}

test.describe('Load Testing Tab', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
        await page.locator('nav >> text=Load Testing').click();
    });

    // Helper to click sub-tabs (first matching button)
    const clickSubTab = async (page, tabName) => {
        await page.locator(`button:has-text("${tabName}")`).first().click();
    };

    test('TC070 - Load Testing tab should load correctly', async ({ page }) => {
        await expect(page.locator('h1:has-text("Load Testing")')).toBeVisible({ timeout: 10000 });
    });

    test('TC071 - Load Testing should display sub-tabs', async ({ page }) => {
        await expect(page.locator('button:has-text("API Discovery")').first()).toBeVisible();
        await expect(page.locator('button:has-text("APIs")').first()).toBeVisible();
        await expect(page.locator('button:has-text("Configuration")').first()).toBeVisible();
        await expect(page.locator('button:has-text("Results")').first()).toBeVisible();
        await expect(page.locator('button:has-text("History")').first()).toBeVisible();
    });

    test('TC072 - API Discovery should display target URL input', async ({ page }) => {
        await clickSubTab(page, 'API Discovery');
        await expect(page.locator('text=Target Website')).toBeVisible();
        await expect(page.locator('input[placeholder="https://example.com"]')).toBeVisible();
    });

    test('TC073 - API Discovery should display discovery methods', async ({ page }) => {
        await clickSubTab(page, 'API Discovery');
        await expect(page.locator('text=Discovery Method')).toBeVisible();
        await expect(page.locator('text=Auto Discovery')).toBeVisible();
        await expect(page.locator('text=OpenAPI/Swagger')).toBeVisible();
        await expect(page.locator('text=HAR File')).toBeVisible();
        await expect(page.locator('text=Manual Entry')).toBeVisible();
    });

    test('TC074 - Discover APIs button should be visible', async ({ page }) => {
        await clickSubTab(page, 'API Discovery');
        await expect(page.locator('button:has-text("Discover APIs")')).toBeVisible();
    });

    test('TC075 - URL input should accept valid URLs', async ({ page }) => {
        await clickSubTab(page, 'API Discovery');

        const urlInput = page.locator('input[placeholder="https://example.com"]');
        await urlInput.fill('https://api.example.com');
        await expect(urlInput).toHaveValue('https://api.example.com');
    });

    test('TC076 - Configuration tab should display test settings', async ({ page }) => {
        await clickSubTab(page, 'Configuration');
        await expect(page.locator('text=Test Configuration')).toBeVisible();
    });

    test('TC077 - Configuration should display load parameters', async ({ page }) => {
        await clickSubTab(page, 'Configuration');
        await expect(page.locator('text=Load Parameters')).toBeVisible();
    });

    test('TC078 - Configuration should display Virtual Users input', async ({ page }) => {
        await clickSubTab(page, 'Configuration');
        await expect(page.locator('text=Virtual Users')).toBeVisible();
    });

    test('TC079 - Configuration should display Ramp-up Time input', async ({ page }) => {
        await clickSubTab(page, 'Configuration');
        await expect(page.locator('text=Ramp-up Time')).toBeVisible();
    });

    test('TC080 - Configuration should display Test Duration input', async ({ page }) => {
        await clickSubTab(page, 'Configuration');
        await expect(page.locator('text=Test Duration')).toBeVisible();
    });

    test('TC081 - Configuration should display Requests per Second input', async ({ page }) => {
        await clickSubTab(page, 'Configuration');
        await expect(page.locator('label:has-text("Requests per Second")')).toBeVisible();
    });

    test('TC082 - Configuration should display Authentication section', async ({ page }) => {
        await clickSubTab(page, 'Configuration');
        await expect(page.locator('span:has-text("Authentication")')).toBeVisible();
    });

    test('TC083 - Configuration should display auth type options', async ({ page }) => {
        await clickSubTab(page, 'Configuration');
        await expect(page.locator('text=Authentication Type')).toBeVisible();
    });

    test('TC084 - Configuration should display Custom Headers section', async ({ page }) => {
        await clickSubTab(page, 'Configuration');
        await expect(page.locator('span:has-text("Custom Headers")')).toBeVisible();
    });

    test('TC085 - Configuration should display Advanced Settings', async ({ page }) => {
        await clickSubTab(page, 'Configuration');
        await expect(page.locator('span:has-text("Advanced Settings")')).toBeVisible();
    });

    test('TC086 - Configuration should display Environment selector', async ({ page }) => {
        await clickSubTab(page, 'Configuration');
        await expect(page.locator('text=Environment')).toBeVisible();
    });

    test('TC087 - Configuration should display Load Testing Tool selector', async ({ page }) => {
        await clickSubTab(page, 'Configuration');
        await expect(page.locator('text=Load Testing Tool')).toBeVisible();
    });

    test('TC088 - Configuration should display Schedule Test option', async ({ page }) => {
        await clickSubTab(page, 'Configuration');
        await expect(page.locator('span:has-text("Schedule Test")')).toBeVisible();
    });

    test('TC089 - Results tab should display no results message initially', async ({ page }) => {
        await clickSubTab(page, 'Results');
        await expect(page.locator('text=No Results Yet')).toBeVisible();
    });

    test('TC090 - History tab should be accessible', async ({ page }) => {
        await clickSubTab(page, 'History');
        // History tab should be active
        await expect(page.locator('button:has-text("History")').first()).toBeVisible();
    });

    test('TC091 - Load profile preview should be visible in configuration', async ({ page }) => {
        await clickSubTab(page, 'Configuration');
        await expect(page.locator('text=Load Profile Preview')).toBeVisible();
    });

    test('TC092 - API Discovery should show scan progress when scanning', async ({ page }) => {
        await clickSubTab(page, 'API Discovery');

        // Enter a URL
        const urlInput = page.locator('input[placeholder="https://example.com"]');
        await urlInput.fill('https://api.example.com');

        // Click discover
        await page.locator('button:has-text("Discover APIs")').click();

        // Should show scanning progress
        await expect(page.locator('text=Scanning Progress')).toBeVisible({ timeout: 5000 });
    });
});
