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

    // Wait for dashboard to load
    await expect(page.locator('nav >> text=Dashboard')).toBeVisible({ timeout: 5000 });
}

test.describe('Dashboard Page', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    test('TC011 - Dashboard should display all navigation tabs', async ({ page }) => {
        // Verify all sidebar navigation items
        await expect(page.locator('nav >> text=Dashboard')).toBeVisible();
        await expect(page.locator('nav >> text=Statistics')).toBeVisible();
        await expect(page.locator('nav >> text=History')).toBeVisible();
        await expect(page.locator('nav >> text=Reports')).toBeVisible();
        await expect(page.locator('nav >> text=Visual Testing')).toBeVisible();
        await expect(page.locator('nav >> text=Functional Testing')).toBeVisible();
        await expect(page.locator('nav >> text=Security Testing')).toBeVisible();
        await expect(page.locator('nav >> text=Load Testing')).toBeVisible();
    });

    test('TC012 - Dashboard should display test summary cards', async ({ page }) => {
        // Verify summary cards are present
        await expect(page.locator('text=Playwright Tests')).toBeVisible();
        await expect(page.locator('text=Functional Tests')).toBeVisible();
        await expect(page.locator('text=Visual Tests')).toBeVisible();
    });

    test('TC013 - Dashboard should display quick stats', async ({ page }) => {
        // Verify quick stat cards (use first() to avoid matching similar text)
        await expect(page.locator('text=Total Runs')).toBeVisible();
        await expect(page.locator('p:has-text("Passed")').first()).toBeVisible();
        await expect(page.locator('p:has-text("Failed")').first()).toBeVisible();
        await expect(page.locator('text=Success Rate')).toBeVisible();
    });

    test('TC014 - Dashboard should display recent activity section', async ({ page }) => {
        await expect(page.locator('text=Recent Activity')).toBeVisible();
    });

    test('TC015 - Sidebar status indicator should show Idle when not running', async ({ page }) => {
        await expect(page.locator('text=Idle')).toBeVisible();
        await expect(page.locator('text=Ready to execute')).toBeVisible();
    });

    test('TC016 - User info should display in sidebar', async ({ page }) => {
        await expect(page.locator('text=Developer')).toBeVisible();
        await expect(page.locator('text=Logged in')).toBeVisible();
    });

    test('TC017 - Sign Out button should be visible', async ({ page }) => {
        await expect(page.locator('button:has-text("Sign Out")')).toBeVisible();
    });

    test('TC018 - Sign Out should redirect to login page', async ({ page }) => {
        await page.locator('button:has-text("Sign Out")').click();

        // Should be on login page
        await expect(page.locator('text=Sign in to access the dashboard')).toBeVisible();
    });

    test('TC019 - Navigation to Statistics should work', async ({ page }) => {
        await page.locator('nav >> text=Statistics').click();
        // Statistics page shows either "Execution Statistics" or "No Execution Data"
        const hasStats = await page.locator('text=Execution Statistics').isVisible().catch(() => false);
        const hasNoData = await page.locator('text=No Execution Data').isVisible().catch(() => false);
        expect(hasStats || hasNoData).toBeTruthy();
    });

    test('TC020 - Navigation to History should work', async ({ page }) => {
        await page.locator('nav >> text=History').click();
        await expect(page.locator('text=Execution History')).toBeVisible();
    });

    test('TC021 - Navigation to Reports should work', async ({ page }) => {
        await page.locator('nav >> text=Reports').click();
        await expect(page.locator('text=Test Reports')).toBeVisible();
    });
});
