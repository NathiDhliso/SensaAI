import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/learner.json';

setup('authenticate as learner', async ({ page }) => {
  // Go to login page
  await page.goto('/login');
  
  // Fill in credentials
  await page.getByLabel(/email/i).fill('nkosinathi.dhliso@gmail.com');
  await page.getByLabel(/password/i).fill('Magnox271991!');
  
  // Click sign in
  await page.getByRole('button', { name: /sign in/i }).click();
  
  // Wait for navigation to complete
  await page.waitForURL(/\/(home|dashboard|study|launchpad|$)/, { timeout: 15000 });
  
  // Wait a bit for auth to settle
  await page.waitForTimeout(2000);
  
  // Save signed-in state
  await page.context().storageState({ path: authFile });
  
  console.log('✓ Authentication successful');
});
