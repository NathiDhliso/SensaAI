import { test as setup, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const learnerAuthFile = 'playwright/.auth/learner.json';

function loadTestEnv() {
  const envPath = path.resolve(__dirname, '..', '.env.playwright');
  if (!fs.existsSync(envPath)) {
    throw new Error(
      '.env.playwright file not found. Create it with LEARNER_EMAIL and LEARNER_PASSWORD.'
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

setup('authenticate learner', async ({ page }) => {
  setup.setTimeout(60000);

  const env = loadTestEnv();
  const email = env.LEARNER_EMAIL;
  const password = env.LEARNER_PASSWORD;

  if (!email || !password) {
    throw new Error('LEARNER_EMAIL and LEARNER_PASSWORD must be set in .env.playwright');
  }

  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  const emailInput = page.getByLabel('Email');
  const passwordInput = page.getByLabel('Password');

  await emailInput.fill(email);
  await passwordInput.fill(password);

  await page.waitForTimeout(300);

  const signInBtn = page.getByRole('button', { name: /sign in/i });
  await expect(signInBtn).toBeEnabled({ timeout: 5000 });
  await signInBtn.click();

  await page.waitForURL('/', { timeout: 30000 });
  await expect(
    page.getByPlaceholder('Search certifications or enter any subject...')
      .or(page.getByText('Generation Restricted'))
  ).toBeVisible({ timeout: 15000 });

  await page.context().storageState({ path: learnerAuthFile });
});
