// @ts-check
const { test, expect } = require('@playwright/test');

const BASE = 'http://localhost:5173';

test.describe('Authentication', () => {
  test('login page loads', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await expect(page.locator('input[type="text"], input[name="username"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test('login with valid credentials', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.fill('input[type="text"], input[name="username"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE}/dashboard`, { timeout: 8000 });
    await expect(page).toHaveURL(/dashboard/);
  });

  test('login with wrong password shows error', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.fill('input[type="text"], input[name="username"]', 'admin');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    // Should stay on login page
    await page.waitForTimeout(2000);
    await expect(page).not.toHaveURL(/dashboard/);
  });

  test('logout clears session', async ({ page }) => {
    // Login first
    await page.goto(`${BASE}/login`);
    await page.fill('input[type="text"], input[name="username"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE}/dashboard`, { timeout: 8000 });

    // Logout via localStorage clear simulation
    await page.evaluate(() => localStorage.clear());
    await page.goto(`${BASE}/dashboard`);
    // Should redirect to login
    await expect(page).toHaveURL(/login/);
  });
});
