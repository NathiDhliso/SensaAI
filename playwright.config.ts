import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['list']
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'on',
    video: 'retain-on-failure',
    actionTimeout: 15000,
  },
  projects: [
    {
      name: 'setup-admin',
      testMatch: /auth\.setup\.ts/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'setup-learner',
      testMatch: /auth-learner\.setup\.ts/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: { cookies: [], origins: [] },
      },
      testIgnore: /\.setup\.ts|learner-experience\.spec\.ts|smoke-admin\.spec\.ts|smoke-learner\.spec\.ts/,
    },
    {
      name: 'authenticated',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      testMatch: /learner-experience\.spec\.ts/,
      dependencies: ['setup-admin'],
    },
    {
      name: 'admin-smoke',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/admin.json',
      },
      testMatch: /smoke-admin\.spec\.ts/,
      dependencies: ['setup-admin'],
    },
    {
      name: 'learner-smoke',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/learner.json',
      },
      testMatch: /smoke-learner\.spec\.ts/,
      dependencies: ['setup-learner'],
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 5'] },
      testIgnore: /\.setup\.ts|learner-experience\.spec\.ts|smoke-admin\.spec\.ts|smoke-learner\.spec\.ts/,
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 30000,
  },
});
