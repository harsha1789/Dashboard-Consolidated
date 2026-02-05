
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

test.describe('Visual Testing Tab', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
        await page.locator('nav >> text=Visual Testing').click();
    });

    test('TC022 - Visual Testing tab should load correctly', async ({ page }) => {
        await expect(page.locator('h1:has-text("Visual Testing")')).toBeVisible({ timeout: 10000 });
    });

    test('TC023 - Visual Testing should display Run Visual Test form', async ({ page }) => {
        await expect(page.locator('h2:has-text("Run Visual Test")')).toBeVisible();
    });

    test('TC024 - Visual Testing form should have Website URL input', async ({ page }) => {
        await expect(page.locator('text=Website URL')).toBeVisible();
        await expect(page.locator('input[placeholder="https://example.com"]')).toBeVisible();
    });

    test('TC025 - Visual Testing should have Run Test button', async ({ page }) => {
        await expect(page.locator('button:has-text("Run Test")')).toBeVisible();
    });

    test('TC026 - Manage Baselines button should be visible', async ({ page }) => {
        await expect(page.locator('button:has-text("Manage Baselines")')).toBeVisible();
    });

    test('TC027 - URL input should accept valid URLs', async ({ page }) => {
        const urlInput = page.locator('input[placeholder="https://example.com"]');
        await urlInput.fill('https://test.example.com');
        await expect(urlInput).toHaveValue('https://test.example.com');
    });

    test('TC028 - Authentication section should appear after URL entry', async ({ page }) => {
        const urlInput = page.locator('input[placeholder="https://example.com"]');
        await urlInput.fill('https://test.example.com');
        await expect(page.locator('text=Authentication')).toBeVisible({ timeout: 5000 });
    });

    test('TC029 - Routes section should appear after URL entry', async ({ page }) => {
        const urlInput = page.locator('input[placeholder="https://example.com"]');
        await urlInput.fill('https://test.example.com');
        await expect(page.locator('text=Select Routes to Test')).toBeVisible({ timeout: 5000 });
    });

    test('TC030 - Add custom route button should be visible after URL entry', async ({ page }) => {
        const urlInput = page.locator('input[placeholder="https://example.com"]');
        await urlInput.fill('https://test.example.com');
        await expect(page.locator('button:has-text("Add")')).toBeVisible({ timeout: 5000 });
    });
});
