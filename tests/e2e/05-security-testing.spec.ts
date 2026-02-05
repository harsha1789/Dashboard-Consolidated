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

test.describe('Security Testing Tab', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
        await page.locator('nav >> text=Security Testing').click();
    });

    // Helper to click sub-tabs (first matching button in the tab bar)
    const clickSubTab = async (page, tabName) => {
        await page.locator(`button:has-text("${tabName}")`).first().click();
    };

    test('TC046 - Security Testing tab should load correctly', async ({ page }) => {
        await expect(page.locator('h1:has-text("Security Testing")')).toBeVisible({ timeout: 10000 });
    });

    test('TC047 - Security Testing should display sub-tabs', async ({ page }) => {
        await expect(page.locator('button:has-text("Overview")').first()).toBeVisible();
        await expect(page.locator('button:has-text("SAST")').first()).toBeVisible();
        await expect(page.locator('button:has-text("DAST")').first()).toBeVisible();
        await expect(page.locator('button:has-text("SCA")').first()).toBeVisible();
        await expect(page.locator('button:has-text("Threat Model")').first()).toBeVisible();
    });

    test('TC048 - Overview should display security score', async ({ page }) => {
        await clickSubTab(page, 'Overview');
        await expect(page.locator('text=Security Score')).toBeVisible();
    });

    test('TC049 - Overview should display vulnerability summary', async ({ page }) => {
        await clickSubTab(page, 'Overview');
        await expect(page.locator('text=Critical Issues')).toBeVisible();
        await expect(page.locator('text=High Severity')).toBeVisible();
        await expect(page.locator('text=Medium Severity')).toBeVisible();
        await expect(page.locator('text=Low Severity')).toBeVisible();
    });

    test('TC050 - Overview should display recent scans', async ({ page }) => {
        await clickSubTab(page, 'Overview');
        await expect(page.locator('text=Recent Security Scans')).toBeVisible();
    });

    test('TC051 - SAST tab should display Static Application Security Testing header', async ({ page }) => {
        await clickSubTab(page, 'SAST');
        await expect(page.locator('text=Static Application Security Testing')).toBeVisible();
    });

    test('TC052 - SAST tab should display Upload Source Code option', async ({ page }) => {
        await clickSubTab(page, 'SAST');
        await expect(page.locator('text=Upload Source Code')).toBeVisible();
    });

    test('TC053 - SAST tab should display code paste option', async ({ page }) => {
        await clickSubTab(page, 'SAST');
        await expect(page.locator('text=Or Paste Code Snippet')).toBeVisible();
    });

    test('TC054 - SAST tab should display Start SAST Scan button', async ({ page }) => {
        await clickSubTab(page, 'SAST');
        await expect(page.locator('button:has-text("Start SAST Scan")')).toBeVisible();
    });

    test('TC055 - SAST tab should display detected vulnerabilities', async ({ page }) => {
        await clickSubTab(page, 'SAST');
        await expect(page.locator('text=Detected Vulnerabilities')).toBeVisible();
    });

    test('TC056 - DAST tab should display Dynamic Application Security Testing header', async ({ page }) => {
        await clickSubTab(page, 'DAST');
        await expect(page.locator('text=Dynamic Application Security Testing')).toBeVisible();
    });

    test('TC057 - DAST tab should display target URL input', async ({ page }) => {
        await clickSubTab(page, 'DAST');
        await expect(page.locator('text=Target URL')).toBeVisible();
    });

    test('TC058 - DAST tab should display scan type options', async ({ page }) => {
        await clickSubTab(page, 'DAST');
        await expect(page.locator('text=Scan Type')).toBeVisible();
        await expect(page.locator('text=Quick Scan')).toBeVisible();
        await expect(page.locator('text=Full Scan')).toBeVisible();
    });

    test('TC059 - DAST tab should display authenticated scan toggle', async ({ page }) => {
        await clickSubTab(page, 'DAST');
        await expect(page.locator('text=Authenticated Scan')).toBeVisible();
    });

    test('TC060 - DAST tab should display Start DAST Scan button', async ({ page }) => {
        await clickSubTab(page, 'DAST');
        await expect(page.locator('button:has-text("Start DAST Scan")')).toBeVisible();
    });

    test('TC061 - SCA tab should display Software Composition Analysis header', async ({ page }) => {
        await clickSubTab(page, 'SCA');
        await expect(page.locator('text=Software Composition Analysis')).toBeVisible();
    });

    test('TC062 - SCA tab should display dependency upload option', async ({ page }) => {
        await clickSubTab(page, 'SCA');
        await expect(page.locator('text=Upload dependency manifest')).toBeVisible();
    });

    test('TC063 - SCA tab should display dependencies list', async ({ page }) => {
        await clickSubTab(page, 'SCA');
        await expect(page.locator('h3:has-text("Dependencies")')).toBeVisible();
    });

    test('TC064 - SCA tab should display vulnerability stats', async ({ page }) => {
        await clickSubTab(page, 'SCA');
        await expect(page.locator('text=Total Dependencies')).toBeVisible();
        await expect(page.locator('span:has-text("Vulnerable")').first()).toBeVisible();
    });

    test('TC065 - SCA tab should display remediation section', async ({ page }) => {
        await clickSubTab(page, 'SCA');
        await expect(page.locator('text=Quick Remediation')).toBeVisible();
    });

    test('TC066 - Threat Model tab should display STRIDE methodology', async ({ page }) => {
        await clickSubTab(page, 'Threat Model');
        await expect(page.locator('text=Threat Modeling (STRIDE)')).toBeVisible();
    });

    test('TC067 - Threat Model tab should display critical assets', async ({ page }) => {
        await clickSubTab(page, 'Threat Model');
        await expect(page.getByRole('heading', { name: 'Critical Assets' })).toBeVisible();
    });

    test('TC068 - Threat Model tab should display risk matrix', async ({ page }) => {
        await clickSubTab(page, 'Threat Model');
        await expect(page.locator('text=Risk Assessment Matrix')).toBeVisible();
    });

    test('TC069 - Quick action buttons should navigate to respective tabs', async ({ page }) => {
        await clickSubTab(page, 'Overview');

        // Click on Run SAST Scan quick action
        await page.locator('text=Run SAST Scan').click();
        await expect(page.locator('text=Static Application Security Testing')).toBeVisible();
    });
});
