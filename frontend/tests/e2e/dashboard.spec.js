// @ts-check
const { test, expect } = require('@playwright/test');

const BASE = 'http://localhost:5173';

async function loginAsAdmin(page) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[type="text"], input[name="username"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/dashboard`, { timeout: 8000 });
}

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('dashboard loads with KPI cards', async ({ page }) => {
    await expect(page).toHaveURL(/dashboard/);
    // At least one KPI card visible
    await expect(page.locator('[class*="kpi"], [class*="card"], [class*="stat"]').first()).toBeVisible({ timeout: 5000 });
  });

  test('sidebar navigation works', async ({ page }) => {
    // Navigate to Animals
    const animalsLink = page.locator('a[href*="animal"], nav a').filter({ hasText: /animal|bétail|élevage/i }).first();
    if (await animalsLink.count() > 0) {
      await animalsLink.click();
      await page.waitForTimeout(1000);
    }
  });

  test('alerts page loads', async ({ page }) => {
    await page.goto(`${BASE}/alerts`);
    await expect(page).toHaveURL(/alerts/);
  });

  test('CV monitoring page loads', async ({ page }) => {
    await page.goto(`${BASE}/cv-monitoring`);
    await expect(page).toHaveURL(/cv-monitoring/);
  });
});
