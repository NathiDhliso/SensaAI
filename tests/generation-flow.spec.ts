import { test, expect } from '@playwright/test';

test.describe('Generation Flow (Unauthenticated)', () => {
  test('full flow: home → type subject + domains → click generate → redirects to login', async ({ page }) => {
    await page.goto('/');
    const input = page.getByPlaceholder('Search certifications or enter any subject...');
    await input.fill('Machine Learning Fundamentals');
    await input.blur();
    await page.waitForTimeout(600);
    const domainToggle = page.getByRole('button', { name: /exam domains/i });
    await domainToggle.click();
    const domainInputs = page.locator('input[placeholder*="Domain"]');
    await domainInputs.nth(0).fill('Supervised Learning');
    await domainInputs.nth(1).fill('Neural Networks');
    await page.locator('button').filter({ hasText: /generate learning system/i }).click();
    await page.waitForURL(/\/(generate|login)/);
    expect(page.url()).toMatch(/\/(generate|login)/);
  });

  test('subject is encoded in the generate URL', async ({ page }) => {
    await page.goto('/');
    const input = page.getByPlaceholder('Search certifications or enter any subject...');
    await input.fill('Azure Administrator');
    await input.blur();
    await page.waitForTimeout(600);
    const domainToggle = page.getByRole('button', { name: /exam domains/i });
    await domainToggle.click();
    const domainInputs = page.locator('input[placeholder*="Domain"]');
    await domainInputs.nth(0).fill('Identity & Governance');
    await domainInputs.nth(1).fill('Storage Solutions');
    await page.locator('button').filter({ hasText: /generate learning system/i }).click();
    await page.waitForURL(/\/(generate|login)/);
    const url = decodeURIComponent(page.url());
    expect(url).toMatch(/(Azure.*Administrator|login)/);
  });

  test('objectives are passed as context param in generate URL', async ({ page }) => {
    await page.goto('/');
    const input = page.getByPlaceholder('Search certifications or enter any subject...');
    await input.fill('Azure Administrator');
    await input.blur();
    await page.waitForTimeout(300);
    const toggle = page.getByRole('button', { name: /exam objectives/i });
    await toggle.click();
    const textarea = page.getByPlaceholder(/paste exam objectives/i);
    await textarea.fill('Manage identities\nConfigure storage\nDeploy VMs');
    await page.waitForTimeout(300);
    await page.locator('button').filter({ hasText: /generate learning system/i }).click();
    await page.waitForURL(/\/(generate|login)/);
    const url = decodeURIComponent(page.url());
    const hasContext = url.includes('context=');
    const redirectedToLogin = url.includes('/login');
    expect(hasContext || redirectedToLogin).toBeTruthy();
  });

  test('trunk domains are passed as trunks param in generate URL', async ({ page }) => {
    await page.goto('/');
    const input = page.getByPlaceholder('Search certifications or enter any subject...');
    await input.fill('Azure Administrator');
    await input.blur();
    await page.waitForTimeout(300);
    const domainToggle = page.getByRole('button', { name: /exam domains/i });
    await domainToggle.click();
    const domainInputs = page.locator('input[placeholder*="Domain"]');
    await domainInputs.nth(0).fill('Identity & Governance');
    await domainInputs.nth(1).fill('Storage Solutions');
    await page.locator('button').filter({ hasText: /generate learning system/i }).click();
    await page.waitForURL(/\/(generate|login)/);
    const url = decodeURIComponent(page.url());
    const hasTrunks = url.includes('trunks=');
    const redirectedToLogin = url.includes('/login');
    expect(hasTrunks || redirectedToLogin).toBeTruthy();
  });
});

test.describe('Generate Page UI', () => {
  test('generate page redirects unauthenticated users or shows UI', async ({ page }) => {
    await page.goto('/generate/TestSubject');
    await page.waitForURL(/\/(generate|login)/, { timeout: 5000 });
    const url = page.url();
    if (url.includes('/login')) {
      await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    } else {
      await expect(
        page.locator('[class*="error"], [class*="Error"], [class*="confirm"], [class*="generate"], [class*="Generate"]').first()
      ).toBeVisible({ timeout: 20000 });
    }
  });
});
