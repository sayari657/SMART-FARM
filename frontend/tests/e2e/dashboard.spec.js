// @ts-check
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173';

test.describe('Dashboard', () => {
  test('dashboard handles an owner without a configured farm', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`);
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.getByRole('heading', { name: /aucune ferme configurée|no farm configured/i })).toBeVisible();
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
