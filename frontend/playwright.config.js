// @ts-check
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.js',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'auth',
      testMatch: /auth\.spec\.js/,
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
    {
      name: 'app',
      testMatch: /(ai_scanner|dashboard)\.spec\.js/,
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        storageState: './tests/e2e/.auth/owner.json',
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    env: {
      ...process.env,
      VITE_E2E_HTTP: '1',
    },
    reuseExistingServer: true,
    timeout: 60000,
  },
});
