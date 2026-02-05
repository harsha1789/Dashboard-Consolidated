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

test.describe('Reports Page', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
        await page.locator('nav >> text=Reports').click();
    });

    // Helper to click report sub-tabs
    const clickReportTab = async (page, tabName) => {
        // Use getByRole with exact match to avoid conflicts with sidebar buttons
        await page.getByRole('button', { name: tabName, exact: true }).click();
    };

    test('TC093 - Reports page should load correctly', async ({ page }) => {
        await expect(page.locator('text=Test Reports')).toBeVisible({ timeout: 10000 });
    });

    test('TC094 - Reports should display sub-tabs', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Playwright', exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Functional', exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Visual', exact: true })).toBeVisible();
    });

    test('TC095 - Playwright tab should be clickable', async ({ page }) => {
        await clickReportTab(page, 'Playwright');
        await expect(page.getByRole('button', { name: 'Playwright', exact: true })).toBeVisible();
    });

    test('TC096 - Playwright tab should have Save as PDF button', async ({ page }) => {
        await clickReportTab(page, 'Playwright');
        await expect(page.locator('button:has-text("Save as PDF")')).toBeVisible();
    });

    test('TC097 - Playwright tab should have Failed Screenshots button', async ({ page }) => {
        await clickReportTab(page, 'Playwright');
        await expect(page.locator('button:has-text("Failed Screenshots")')).toBeVisible();
    });

    test('TC098 - Functional tab should be clickable', async ({ page }) => {
        await clickReportTab(page, 'Functional');
        await expect(page.getByRole('button', { name: 'Functional', exact: true })).toBeVisible();
    });

    test('TC099 - Visual tab should be clickable', async ({ page }) => {
        await clickReportTab(page, 'Visual');
        await expect(page.getByRole('button', { name: 'Visual', exact: true })).toBeVisible();
    });

    test('TC100 - Report iframe should be present for Playwright', async ({ page }) => {
        await clickReportTab(page, 'Playwright');
        const iframe = page.locator('iframe');
        await expect(iframe).toBeVisible({ timeout: 10000 });
    });
});
