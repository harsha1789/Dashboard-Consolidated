import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
    test.beforeEach(async ({ page }) => {
        // Clear session storage before each test
        await page.goto('/');
        await page.evaluate(() => sessionStorage.clear());
        await page.reload();
    });

    test('TC001 - Login page should display correctly', async ({ page }) => {
        await page.goto('/');

        // Verify logo and title
        await expect(page.getByRole('heading', { name: 'Automation Hub' })).toBeVisible();
        await expect(page.locator('text=Sign in to access the dashboard')).toBeVisible();

        // Verify role selector
        await expect(page.locator('text=Select Role')).toBeVisible();
        await expect(page.locator('button:has-text("Choose your role...")')).toBeVisible();

        // Verify password field
        await expect(page.locator('input[type="password"]')).toBeVisible();

        // Verify sign in button
        await expect(page.locator('button:has-text("Sign In")')).toBeVisible();

        // Verify role cards at bottom
        await expect(page.locator('text=Developer')).toBeVisible();
        await expect(page.locator('text=QA Engineer')).toBeVisible();
        await expect(page.locator('text=End User')).toBeVisible();
    });

    test('TC002 - Role selection dropdown should work', async ({ page }) => {
        await page.goto('/');

        // Click role selector
        await page.locator('button:has-text("Choose your role...")').click();

        // Verify dropdown options
        await expect(page.locator('button:has-text("Developer")').first()).toBeVisible();
        await expect(page.locator('button:has-text("QA Engineer")').first()).toBeVisible();
        await expect(page.locator('button:has-text("End User")').first()).toBeVisible();

        // Select Developer role
        await page.locator('button:has-text("Developer")').first().click();

        // Verify selection is displayed
        await expect(page.locator('p:has-text("Full access to all features")')).toBeVisible();
    });

    test('TC003 - Login should fail without selecting role', async ({ page }) => {
        await page.goto('/');

        // Enter password without selecting role
        await page.locator('input[type="password"]').fill('Zensar');
        await page.locator('button:has-text("Sign In")').click();

        // Verify error message
        await expect(page.locator('text=Please select a role')).toBeVisible();
    });

    test('TC004 - Login should fail without password', async ({ page }) => {
        await page.goto('/');

        // Select role
        await page.locator('button:has-text("Choose your role...")').click();
        await page.locator('button:has-text("Developer")').first().click();

        // Click sign in without password
        await page.locator('button:has-text("Sign In")').click();

        // Verify error message
        await expect(page.locator('text=Please enter password')).toBeVisible();
    });

    test('TC005 - Login should fail with invalid password', async ({ page }) => {
        await page.goto('/');

        // Select role
        await page.locator('button:has-text("Choose your role...")').click();
        await page.locator('button:has-text("Developer")').first().click();

        // Enter invalid password
        await page.locator('input[type="password"]').fill('WrongPassword');
        await page.locator('button:has-text("Sign In")').click();

        // Wait for error (simulated delay in login)
        await expect(page.locator('text=Invalid password')).toBeVisible({ timeout: 5000 });
    });

    test('TC006 - Login should succeed with valid credentials - Developer', async ({ page }) => {
        await page.goto('/');

        // Select Developer role
        await page.locator('button:has-text("Choose your role...")').click();
        await page.locator('button:has-text("Developer")').first().click();

        // Enter valid password
        await page.locator('input[type="password"]').fill('Zensar');
        await page.locator('button:has-text("Sign In")').click();

        // Wait for dashboard to load - check for nav element
        await expect(page.locator('nav >> text=Dashboard')).toBeVisible({ timeout: 5000 });
    });

    test('TC007 - Login should succeed with valid credentials - QA Engineer', async ({ page }) => {
        await page.goto('/');

        // Select QA role
        await page.locator('button:has-text("Choose your role...")').click();
        await page.locator('button:has-text("QA Engineer")').first().click();

        // Enter valid password
        await page.locator('input[type="password"]').fill('Zensar');
        await page.locator('button:has-text("Sign In")').click();

        // Wait for dashboard to load
        await expect(page.locator('nav >> text=Dashboard')).toBeVisible({ timeout: 5000 });
    });

    test('TC008 - Login should succeed with valid credentials - End User', async ({ page }) => {
        await page.goto('/');

        // Select End User role
        await page.locator('button:has-text("Choose your role...")').click();
        await page.locator('button:has-text("End User")').first().click();

        // Enter valid password
        await page.locator('input[type="password"]').fill('Zensar');
        await page.locator('button:has-text("Sign In")').click();

        // Wait for dashboard to load
        await expect(page.locator('nav >> text=Dashboard')).toBeVisible({ timeout: 5000 });
    });

    test('TC009 - Role selection via bottom cards should work', async ({ page }) => {
        await page.goto('/');

        // Click on QA Engineer card at bottom
        await page.locator('div:has-text("QA Engineer")').last().click();

        // Verify role is selected in dropdown
        await expect(page.locator('p:has-text("Test execution and reporting")')).toBeVisible();
    });

    test('TC010 - Session should persist after page refresh', async ({ page }) => {
        await page.goto('/');

        // Login
        await page.locator('button:has-text("Choose your role...")').click();
        await page.locator('button:has-text("Developer")').first().click();
        await page.locator('input[type="password"]').fill('Zensar');
        await page.locator('button:has-text("Sign In")').click();

        // Wait for dashboard
        await expect(page.locator('nav >> text=Dashboard')).toBeVisible({ timeout: 5000 });

        // Refresh page
        await page.reload();

        // Should still be on dashboard (not login)
        await expect(page.locator('nav >> text=Dashboard')).toBeVisible();
    });
});
