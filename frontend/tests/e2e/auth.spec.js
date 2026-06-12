// @ts-check
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173';
const OWNER_USER = 'admin';
const OWNER_PASS = 'admin123';
const SUPERADMIN_USER = 'superadmin';
const SUPERADMIN_PASS = 'SuperAdmin2026!';

// ── Landing Page ──────────────────────────────────────────────────────────────

test.describe('Landing Page', () => {
  test('hero section visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('navigation').getByText('SMART FARM AI', { exact: true })).toBeVisible();
    await expect(page.locator('a[href="#pricing"]').first()).toBeVisible();
  });

  test('3 pricing plans rendered', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Initiation')).toBeVisible();
    await expect(page.locator('text=Professionnel')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Entreprise', exact: true }).first()).toBeVisible();
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
    await expect(page.getByText(/invalid credentials|login failed|incorrect|identifiants/i).first()).toBeVisible({ timeout: 8000 });
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

});

test.describe('SuperAdmin Dashboard', () => {
  test.use({ storageState: './tests/e2e/.auth/superadmin.json' });

  test('superadmin can see dashboard stats', async ({ page }) => {
    await page.goto('/superadmin');
    await expect(page.getByText('Propriétaires', { exact: true }).first()).toBeVisible({ timeout: 8000 });
  });
});

// ── 404 ───────────────────────────────────────────────────────────────────────

test.describe('404', () => {
  test('unknown route renders 404', async ({ page }) => {
    await page.goto('/route-that-does-not-exist-xyz123');
    await expect(page.getByRole('heading', { name: /not found|introuvable/i })).toBeVisible({ timeout: 5000 });
  });
});

// ── Worker Login ──────────────────────────────────────────────────────────────

test.describe('Worker Auth', () => {
  test('worker-login page renders phone input', async ({ page }) => {
    await page.goto('/worker-login');
    await expect(page.locator('input[type="tel"], input[placeholder*="phone" i], input[placeholder*="téléphone" i]').first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Authenticated Owner', () => {
  test.use({ storageState: './tests/e2e/.auth/owner.json' });

  test('logout clears session', async ({ page }) => {
    await page.goto(`${BASE}/farms`);
    await page.evaluate(() => localStorage.clear());
    await page.goto(`${BASE}/dashboard`);
    await expect(page).toHaveURL(/login/);
  });
});
