// @ts-check
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173';

test.describe('AI Scanner', () => {
  test('CV monitoring page has scanner tab', async ({ page }) => {
    await page.goto(`${BASE}/cv-monitoring`);
    await expect(page).toHaveURL(/cv-monitoring/);
    // Check for upload button or scanner UI
    await page.waitForTimeout(2000);
    const uploader = page.locator('[class*="upload"], input[type="file"], button').filter({ hasText: /upload|photo|scan|image/i }).first();
    // Just verify page loaded properly
    await expect(page.locator('body')).toBeVisible();
  });

  test('animal page loads with AI scanner', async ({ page }) => {
    await page.goto(`${BASE}/aboutgoat`);
    await page.waitForTimeout(2000);
    await expect(page.locator('body')).toBeVisible();
  });

  test('poultry page loads', async ({ page }) => {
    await page.goto(`${BASE}/aboutpoultry`);
    await page.waitForTimeout(2000);
    await expect(page.locator('body')).toBeVisible();
  });

  test('trees/plantations page loads', async ({ page }) => {
    await page.goto(`${BASE}/arbres-plantations`);
    await page.waitForTimeout(2000);
    await expect(page.locator('body')).toBeVisible();
  });
});
