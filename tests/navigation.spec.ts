import { test, expect } from '@playwright/test';

test.describe('Navigation & Routing', () => {
  test('home page loads at root URL', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/');
    await expect(page.getByPlaceholder('Enter any subject to learn...')).toBeVisible();
  });

  test('login page loads', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('signup page loads', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();
  });

  test('unknown routes do not crash the app', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto('/nonexistent-route');
    await page.waitForTimeout(1000);
    expect(errors.length).toBe(0);
  });

  test('back navigation from login to home works', async ({ page }) => {
    await page.goto('/');
    await page.goto('/login');
    await page.goBack();
    await expect(page).toHaveURL('/');
  });

  test('generate button on home navigates to /generate/:subject', async ({ page }) => {
    await page.goto('/');
    const input = page.getByPlaceholder('Enter any subject to learn...');
    await input.fill('Docker Fundamentals');
    await page.getByRole('button', { name: /generate learning system/i }).click();
    await page.waitForURL(/\/(generate|login)/);
  });
});

test.describe('Loading States', () => {
  test('app renders content after load without getting stuck', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const input = page.getByPlaceholder('Enter any subject to learn...');
    await expect(input).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Page Metadata', () => {
  test('page has a valid title', async ({ page }) => {
    await page.goto('/');
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
    expect(title).not.toBe('Vite App');
  });

  test('page has a viewport meta tag', async ({ page }) => {
    await page.goto('/');
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toContain('width=device-width');
  });
});
