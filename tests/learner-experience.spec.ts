import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/auth/validate', async (route) => {
    const response = await route.fetch({
      url: route.request().url().replace('/auth/validate', '/auth/session/validate'),
    });
    await route.fulfill({ response });
  });
});

test.describe('Authenticated Home — Core Access', () => {
  test('authenticated user lands on home without login redirect', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByPlaceholder('Search certifications or enter any subject...')).toBeVisible();
    expect(page.url()).not.toContain('/login');
  });

  test('authenticated home shows Cloud Library, Saved Results, and Settings', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Cloud Library')).toBeVisible();
    await expect(page.getByText('Saved Results')).toBeVisible();
    await expect(page.getByText('Settings')).toBeVisible();
  });
});

test.describe('Domain-Locked Generation Flow', () => {
  test('subject + 2 exam domains navigates to /generate/ with trunks in URL', async ({ page }) => {
    await page.goto('/');
    const input = page.getByPlaceholder('Search certifications or enter any subject...');
    await input.fill('AWS Solutions Architect');
    await input.blur();
    await page.waitForTimeout(600);
    const domainToggle = page.getByRole('button', { name: /exam domains/i });
    await domainToggle.click();
    const domainInputs = page.locator('input[placeholder*="Domain"]');
    await domainInputs.nth(0).fill('Identity & Governance');
    await domainInputs.nth(1).fill('Storage Solutions');
    await page.locator('button').filter({ hasText: /generate learning system/i }).click();
    await page.waitForURL(/\/generate\//, { timeout: 10000 });
    const url = page.url();
    expect(url).toContain('/generate/');
    expect(url).toContain('trunks=');
    const trunksParam = new URL(url).searchParams.get('trunks');
    const trunks = JSON.parse(trunksParam!);
    expect(trunks).toContain('Identity & Governance');
    expect(trunks).toContain('Storage Solutions');
  });

  test('domain-locked status text reflects user-defined domains', async ({ page }) => {
    await page.goto('/');
    const input = page.getByPlaceholder('Search certifications or enter any subject...');
    await input.fill('Organic Chemistry');
    await input.blur();
    await page.waitForTimeout(600);
    const domainToggle = page.getByRole('button', { name: /exam domains/i });
    await domainToggle.click();
    const domainInputs = page.locator('input[placeholder*="Domain"]');
    await domainInputs.nth(0).fill('Alkanes & Alkenes');
    await domainInputs.nth(1).fill('Reaction Mechanisms');
    await expect(page.getByText(/domains locked|2 domains/i).first()).toBeVisible();
  });
});

test.describe('Objective-Driven Generation Flow', () => {
  test('subject + pasted objectives navigates to /generate/ with context in URL', async ({ page }) => {
    await page.goto('/');
    const input = page.getByPlaceholder('Search certifications or enter any subject...');
    await input.fill('Biology Cell Division');
    await input.blur();
    await page.waitForTimeout(600);
    const toggle = page.getByRole('button', { name: /exam objectives/i });
    await toggle.click();
    const textarea = page.getByPlaceholder(/paste exam objectives/i);
    await textarea.fill('Understand mitosis phases\nCompare mitosis and meiosis\nExplain cytokinesis');
    await page.waitForTimeout(300);
    await expect(page.getByText(/3 objectives detected/i)).toBeVisible();
    await expect(page.getByText(/objective-driven/i)).toBeVisible();
    await page.locator('button').filter({ hasText: /generate learning system/i }).click();
    await page.waitForURL(/\/generate\//, { timeout: 10000 });
    const url = decodeURIComponent(page.url());
    expect(url).toContain('/generate/');
    expect(url).toContain('context=');
  });
});

test.describe('Generation Page — Authenticated', () => {
  test('generation page shows hide button for authenticated user', async ({ page }) => {
    await page.goto('/generate/' + encodeURIComponent('Test Subject'));
    const hideBtn = page.locator('button').filter({ hasText: /hide generation/i });
    await expect(hideBtn).toBeVisible({ timeout: 10000 });
  });

  test('hide generation button returns user to home', async ({ page }) => {
    await page.goto('/generate/' + encodeURIComponent('Test Subject'));
    const hideBtn = page.locator('button').filter({ hasText: /hide generation/i });
    await expect(hideBtn).toBeVisible({ timeout: 10000 });
    await hideBtn.click();
    await expect(page).toHaveURL('/');
  });
});

test.describe('Library — Authenticated', () => {
  test('library page loads without login redirect', async ({ page }) => {
    await page.goto('/library');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/library');
    expect(page.url()).not.toContain('/login');
  });

  test('library page renders meaningful UI', async ({ page }) => {
    await page.goto('/library');
    await page.waitForLoadState('networkidle');
    const hasHeading = await page.locator('h1, h2, [class*="title"], [class*="header"]').first().isVisible().catch(() => false);
    const hasContent = await page.locator('[class*="card"], [class*="list"], [class*="empty"], [class*="grid"]').first().isVisible().catch(() => false);
    expect(hasHeading || hasContent).toBeTruthy();
  });
});

test.describe('Error Resilience — Authenticated', () => {
  test('study route with invalid ID renders without white screen', async ({ page }) => {
    await page.goto('/study/nonexistent-subject-id');
    await page.waitForTimeout(3000);
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(0);
    const hasInteractiveElement = await page.locator('button:visible, a:visible').first().isVisible().catch(() => false);
    expect(hasInteractiveElement).toBeTruthy();
  });

  test('launchpad route with invalid ID renders without white screen', async ({ page }) => {
    await page.goto('/launchpad/nonexistent-id');
    await page.waitForTimeout(3000);
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(0);
    const hasInteractiveElement = await page.locator('button:visible, a:visible').first().isVisible().catch(() => false);
    expect(hasInteractiveElement).toBeTruthy();
  });
});
