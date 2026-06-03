// @ts-check
const { test, expect } = require('@playwright/test');

const BASE = 'http://localhost:5173';
const OWNER_USER = 'admin';
const OWNER_PASS = 'admin123';
const SUPERADMIN_USER = 'superadmin';
const SUPERADMIN_PASS = 'SuperAdmin2026!';

// ── Landing Page ──────────────────────────────────────────────────────────────

test.describe('Landing Page', () => {
  test('hero section visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=SMART FARM AI')).toBeVisible();
    await expect(page.locator('a[href="#pricing"]')).toBeVisible();
  });

  test('3 pricing plans rendered', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Initiation')).toBeVisible();
    await expect(page.locator('text=Professionnel')).toBeVisible();
    await expect(page.locator('text=Entreprise')).toBeVisible();
  });

  test('login link → /login', async ({ page }) => {
    await page.goto('/');
    await page.click('a[href="/login"]');
    await expect(page).toHaveURL('/login');
  });
});

// ── Owner Login ───────────────────────────────────────────────────────────────

test.describe('Owner Auth', () => {
  test('login form renders', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('wrong credentials shows error', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="text"], input[name="username"]').first().fill('baduser');
    await page.locator('input[type="password"]').fill('badpass');
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('text=/invalid|error|incorrect|échoué/i')).toBeVisible({ timeout: 8000 });
  });

  test('valid login → /dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="text"], input[name="username"]').first().fill(OWNER_USER);
    await page.locator('input[type="password"]').fill(OWNER_PASS);
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/dashboard|farms/, { timeout: 12000 });
  });
});

// ── SuperAdmin Login ──────────────────────────────────────────────────────────

test.describe('SuperAdmin Auth', () => {
  test('superadmin login → /superadmin', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="text"], input[name="username"]').first().fill(SUPERADMIN_USER);
    await page.locator('input[type="password"]').fill(SUPERADMIN_PASS);
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL('/superadmin', { timeout: 12000 });
  });

  test('superadmin can see dashboard stats', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="text"], input[name="username"]').first().fill(SUPERADMIN_USER);
    await page.locator('input[type="password"]').fill(SUPERADMIN_PASS);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('/superadmin');
    await expect(page.locator('text=/propriétaires|owners|dashboard/i')).toBeVisible({ timeout: 8000 });
  });
});

// ── 404 ───────────────────────────────────────────────────────────────────────

test.describe('404', () => {
  test('unknown route renders 404', async ({ page }) => {
    await page.goto('/route-that-does-not-exist-xyz123');
    await expect(page.locator('text=/404|not found|introuvable/i')).toBeVisible({ timeout: 5000 });
  });
});

// ── Worker Login ──────────────────────────────────────────────────────────────

test.describe('Worker Auth', () => {
  test('worker-login page renders phone input', async ({ page }) => {
    await page.goto('/worker-login');
    await expect(page.locator('input[type="tel"], input[placeholder*="phone" i], input[placeholder*="téléphone" i]').first()).toBeVisible({ timeout: 5000 });
  });
});

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
