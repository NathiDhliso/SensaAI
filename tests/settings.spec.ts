import { test, expect } from '@playwright/test';

test.describe('Settings Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /settings/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('settings panel opens with title and close button', async ({ page }) => {
    await expect(page.getByText('Settings').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /close settings/i })).toBeVisible();
  });

  test('settings panel can be closed via close button', async ({ page }) => {
    const dialog = page.getByRole('dialog');
    await page.getByRole('button', { name: /close settings/i }).click();
    await page.waitForTimeout(500);
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  });

  test('appearance section has theme and visual style options', async ({ page }) => {
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(/appearance/i)).toBeVisible();
    await expect(dialog.locator('button').filter({ hasText: 'Light' })).toBeVisible();
    await expect(dialog.locator('button').filter({ hasText: 'Dark' })).toBeVisible();
    await expect(dialog.locator('button').filter({ hasText: /^System$/ })).toBeVisible();
    await expect(dialog.locator('button').filter({ hasText: 'Playful' })).toBeVisible();
    await expect(dialog.locator('button').filter({ hasText: 'Scholarly' })).toBeVisible();
  });

  test('theme option can be selected', async ({ page }) => {
    const dialog = page.getByRole('dialog');
    const darkBtn = dialog.locator('button').filter({ hasText: 'Dark' });
    await darkBtn.click();
    await expect(darkBtn).toHaveClass(/active/i);
  });

  test('ai companion section is present', async ({ page }) => {
    await expect(page.getByText(/ai companion/i)).toBeVisible();
    await expect(page.getByText(/voice/i).first()).toBeVisible();
  });

  test('coach intensity slider exists and is interactive', async ({ page }) => {
    const slider = page.locator('input[type="range"]');
    await expect(slider).toBeVisible();
    const value = await slider.inputValue();
    expect(Number(value)).toBeGreaterThanOrEqual(1);
    expect(Number(value)).toBeLessThanOrEqual(5);
  });

  test('practice mode section has sequencing options', async ({ page }) => {
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(/practice mode/i)).toBeVisible();
    await expect(dialog.locator('button').filter({ hasText: 'Blocked' })).toBeVisible();
    await expect(dialog.locator('button').filter({ hasText: /^Mixed$/ })).toBeVisible();
    await expect(dialog.locator('button').filter({ hasText: 'Progressive' })).toBeVisible();
  });

  test('cognitive load section has stress-free toggle', async ({ page }) => {
    await expect(page.getByText(/cognitive load/i)).toBeVisible();
    await expect(page.getByText(/stress-free/i)).toBeVisible();
  });

  test('data section has export and danger zone', async ({ page }) => {
    await expect(page.getByText(/data/i).last()).toBeVisible();
    await expect(page.getByText(/export/i)).toBeVisible();
    await expect(page.getByText(/danger zone/i)).toBeVisible();
  });

  test('danger zone expands to show clear and reset buttons', async ({ page }) => {
    await page.getByText(/danger zone/i).click();
    await expect(page.getByText(/clear progress/i)).toBeVisible();
    await expect(page.getByText(/reset app data/i)).toBeVisible();
  });

  test('persona selector can be opened', async ({ page }) => {
    const changeBtn = page.getByRole('button', { name: /change/i });
    await changeBtn.click();
    const personaButtons = page.locator('[class*="personaGrid"] button, [class*="persona"] button');
    const count = await personaButtons.count();
    expect(count).toBeGreaterThan(0);
  });
});
