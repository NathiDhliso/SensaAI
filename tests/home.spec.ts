import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('renders the home page with subject input', async ({ page }) => {
    const input = page.getByPlaceholder('Enter any subject to learn...');
    await expect(input).toBeVisible();
    await expect(input).toBeFocused();
  });

  test('generate button is disabled when input is empty', async ({ page }) => {
    const generateBtn = page.locator('button').filter({ hasText: /generate learning system/i });
    await expect(generateBtn).toBeVisible();
    await expect(generateBtn).toBeDisabled();
  });

  test('generate button enables when subject is typed', async ({ page }) => {
    const input = page.getByPlaceholder('Enter any subject to learn...');
    await input.fill('AWS Solutions Architect');
    const generateBtn = page.locator('button').filter({ hasText: /generate learning system/i });
    await expect(generateBtn).toBeEnabled();
  });

  test('shows autocomplete suggestions when typing a known subject', async ({ page }) => {
    const input = page.getByPlaceholder('Enter any subject to learn...');
    await input.fill('AWS');
    await expect(page.locator('button').filter({ hasText: 'AWS Solutions Architect' })).toBeVisible();
  });

  test('selecting a suggestion fills the input', async ({ page }) => {
    const input = page.getByPlaceholder('Enter any subject to learn...');
    await input.fill('AWS');
    await page.locator('button').filter({ hasText: 'AWS Solutions Architect' }).click();
    await expect(input).toHaveValue('AWS Solutions Architect');
  });

  test('objectives section expands and collapses', async ({ page }) => {
    const toggle = page.getByRole('button', { name: /paste exam objectives/i });
    await expect(toggle).toBeVisible();
    await toggle.click();
    const textarea = page.getByPlaceholder(/paste your exam objectives/i);
    await expect(textarea).toBeVisible();
    await toggle.click();
    await expect(textarea).not.toBeVisible();
  });

  test('objectives are parsed when pasted', async ({ page }) => {
    const toggle = page.getByRole('button', { name: /paste exam objectives/i });
    await toggle.click();
    const textarea = page.getByPlaceholder(/paste your exam objectives/i);
    await textarea.fill('Manage Azure identities and governance (20-25%)\nCreate users and groups\nManage licenses');
    await expect(page.getByText(/objectives detected/i)).toBeVisible();
  });

  test('trunk domains section expands and allows adding/removing domains', async ({ page }) => {
    const toggle = page.getByRole('button', { name: /define exam domains/i });
    await toggle.click();
    const domainInputs = page.locator('input[placeholder*="Domain"]');
    await expect(domainInputs).toHaveCount(2);
    const addBtn = page.getByRole('button', { name: /add domain/i });
    await addBtn.click();
    await expect(domainInputs).toHaveCount(3);
  });

  test('trunk domains cannot exceed 6', async ({ page }) => {
    const toggle = page.getByRole('button', { name: /define exam domains/i });
    await toggle.click();
    const addBtn = page.getByRole('button', { name: /add domain/i });
    await addBtn.click();
    await addBtn.click();
    await addBtn.click();
    await addBtn.click();
    await expect(page.getByRole('button', { name: /add domain/i })).not.toBeVisible();
  });

  test('filling 2+ trunk domains shows domain-locked status', async ({ page }) => {
    const toggle = page.getByRole('button', { name: /define exam domains/i });
    await toggle.click();
    const inputs = page.locator('input[placeholder*="Domain"]');
    await inputs.nth(0).fill('Identity & Governance');
    await inputs.nth(1).fill('Storage Solutions');
    await expect(page.getByText(/domain-locked/i)).toBeVisible();
  });

  test('Cloud Library button is visible and clickable', async ({ page }) => {
    const cloudBtn = page.getByRole('button', { name: /cloud library/i });
    await expect(cloudBtn).toBeVisible();
    await cloudBtn.click();
    await expect(page.locator('[class*="modal"], [role="dialog"]').first()).toBeVisible();
  });

  test('Saved Results button navigates to /library', async ({ page }) => {
    const savedBtn = page.getByRole('button', { name: /saved results/i });
    await expect(savedBtn).toBeVisible();
    await savedBtn.click();
    await page.waitForURL(/\/(library|login)/);
  });

  test('Settings button opens settings panel', async ({ page }) => {
    const settingsBtn = page.getByRole('button', { name: /settings/i });
    await expect(settingsBtn).toBeVisible();
    await settingsBtn.click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('pressing Enter on subject input triggers generation flow', async ({ page }) => {
    const input = page.getByPlaceholder('Enter any subject to learn...');
    await input.fill('React & TypeScript');
    await input.press('Enter');
    await page.waitForURL(/\/(generate|login)/);
  });

  test('ungrounded mode warning shows when no objectives or domains', async ({ page }) => {
    await expect(page.getByText(/standard mode/i)).toBeVisible();
    await expect(page.getByText(/hallucination/i)).toBeVisible();
  });
});
