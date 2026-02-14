import { test as setup, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const authFile = 'playwright/.auth/user.json';

function loadTestEnv() {
  const envPath = path.resolve(__dirname, '..', '.env.playwright');
  if (!fs.existsSync(envPath)) {
    throw new Error(
      '.env.playwright file not found. Create it with TEST_EMAIL and TEST_PASSWORD.'
    );
  }
  const content = fs.readFileSync(envPath, 'utf-8');
  const vars: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    vars[key.trim()] = rest.join('=').trim();
  }
  return vars;
}

setup('authenticate', async ({ page, request }) => {
  setup.setTimeout(60000);

  const env = loadTestEnv();
  const email = env.TEST_EMAIL;
  const password = env.TEST_PASSWORD;

  if (!email || !password) {
    throw new Error('TEST_EMAIL and TEST_PASSWORD must be set in .env.playwright');
  }

  const loginResponse = await request.post('/api/v1/auth/session/login', {
    data: { email, password },
  });

  if (!loginResponse.ok()) {
    const body = await loginResponse.text();
    throw new Error(
      `Backend login failed (${loginResponse.status()}): ${body}. ` +
      'Ensure backend is running on port 3000 (run: .\\RESTART_BACKEND.ps1)'
    );
  }

  const { user } = await loginResponse.json();

  const setCookieHeaders = loginResponse.headersArray()
    .filter(h => h.name.toLowerCase() === 'set-cookie')
    .map(h => h.value);

  let accessToken = '';
  let refreshToken = '';
  for (const raw of setCookieHeaders) {
    const atMatch = raw.match(/^access_token=([^;]+)/);
    const rtMatch = raw.match(/^refresh_token=([^;]+)/);
    if (atMatch) accessToken = atMatch[1];
    if (rtMatch) refreshToken = rtMatch[1];
  }

  await page.context().addCookies([
    { name: 'access_token', value: accessToken, domain: 'localhost', path: '/' },
    { name: 'refresh_token', value: refreshToken, domain: 'localhost', path: '/' },
  ]);

  await page.route('**/api/v1/auth/validate', async (route) => {
    const response = await route.fetch({
      url: route.request().url().replace('/auth/validate', '/auth/session/validate'),
    });
    await route.fulfill({ response });
  });

  await page.goto('/');

  await page.evaluate(({ user, accessToken, refreshToken }) => {
    const authState = {
      state: {
        user,
        isAuthenticated: true,
        tokens: {
          access_token: accessToken,
          id_token: accessToken,
          refresh_token: refreshToken,
          expires_in: 3600,
          expires_at: Date.now() + 3600000,
        },
        lastValidated: Date.now(),
      },
      version: 0,
    };
    localStorage.setItem('sensaai-auth', JSON.stringify(authState));
  }, { user, accessToken, refreshToken });

  await page.reload();
  await page.waitForTimeout(2000);
  await expect(page.getByPlaceholder('Enter any subject to learn...')).toBeVisible({ timeout: 15000 });

  await page.context().storageState({ path: authFile });
});
