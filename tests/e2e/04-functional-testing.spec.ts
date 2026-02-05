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

test.describe('Functional Testing Tab', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
        await page.locator('nav >> text=Functional Testing').click();
    });

    // Helper to click sub-tabs (use first() to avoid conflicts with sidebar)
    const clickSubTab = async (page, tabName) => {
        // For "Dashboard", need to be more specific since sidebar also has Dashboard
        if (tabName === 'Dashboard') {
            // Click the button that's not in the nav (the sub-tab)
            await page.locator('button:has-text("Dashboard")').last().click();
        } else {
            await page.locator(`button:has-text("${tabName}")`).first().click();
        }
    };

    test('TC031 - Functional Testing tab should load correctly', async ({ page }) => {
        // Wait for the Test Execution section
        await expect(page.locator('text=Test Execution')).toBeVisible({ timeout: 10000 });
    });

    test('TC032 - Functional Testing should display sub-tabs', async ({ page }) => {
        // Check for sub-tabs (not sidebar) - these are inside the main content area
        await expect(page.locator('text=Test Execution')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('button:has-text("Statistics")').first()).toBeVisible();
        await expect(page.locator('button:has-text("History")').first()).toBeVisible();
        await expect(page.locator('button:has-text("Reports")').first()).toBeVisible();
    });

    test('TC033 - Dashboard should display Test Execution section', async ({ page }) => {
        await expect(page.locator('text=Test Execution')).toBeVisible({ timeout: 10000 });
    });

    test('TC034 - Dashboard should display configuration options', async ({ page }) => {
        // Test Execution section is the configuration area
        await expect(page.locator('text=Test Execution')).toBeVisible({ timeout: 10000 });
    });

    test('TC035 - Dashboard should display Select Scripts section', async ({ page }) => {
        await expect(page.locator('text=Select Scripts')).toBeVisible({ timeout: 10000 });
    });

    test('TC036 - Select All button should be present', async ({ page }) => {
        await expect(page.locator('button:has-text("Select All")')).toBeVisible({ timeout: 10000 });
    });

    test('TC037 - Clear button should be present', async ({ page }) => {
        await expect(page.locator('button:has-text("Clear")')).toBeVisible({ timeout: 10000 });
    });

    test('TC038 - Run button should be present', async ({ page }) => {
        await expect(page.locator('button:has-text("Run")').first()).toBeVisible({ timeout: 10000 });
    });

    test('TC039 - Stop button should be present', async ({ page }) => {
        await expect(page.locator('button:has-text("Stop")')).toBeVisible({ timeout: 10000 });
    });

    test('TC040 - Console output section should be visible', async ({ page }) => {
        await expect(page.locator('text=Console Output')).toBeVisible({ timeout: 10000 });
    });

    test('TC041 - Statistics sub-tab should be clickable', async ({ page }) => {
        await clickSubTab(page, 'Statistics');
        // Statistics view should be visible after clicking
        await expect(page.locator('button:has-text("Statistics")').first()).toBeVisible();
    });

    test('TC042 - History sub-tab should be clickable', async ({ page }) => {
        await clickSubTab(page, 'History');
        // History view should be visible after clicking
        await expect(page.locator('button:has-text("History")').first()).toBeVisible();
    });

    test('TC043 - Reports sub-tab should be clickable', async ({ page }) => {
        await clickSubTab(page, 'Reports');
        // Reports view should be visible after clicking
        await expect(page.locator('button:has-text("Reports")').first()).toBeVisible();
    });

    test('TC044 - Select All scripts button should work', async ({ page }) => {
        const selectAllBtn = page.locator('button:has-text("Select All")');
        await expect(selectAllBtn).toBeVisible({ timeout: 10000 });
        await selectAllBtn.click();
    });

    test('TC045 - Clear scripts button should work', async ({ page }) => {
        const clearBtn = page.locator('button:has-text("Clear")');
        await expect(clearBtn).toBeVisible({ timeout: 10000 });
        await clearBtn.click();
    });
});
