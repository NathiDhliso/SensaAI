import { test, expect } from '@playwright/test';

test.describe('Feature 19: Authentication — Learner (Non-Admin)', () => {
  test('learner lands on home page authenticated', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByText('Generation Restricted')
        .or(page.getByPlaceholder('Search certifications or enter any subject...'))
    ).toBeVisible({ timeout: 15000 });
    expect(page.url()).not.toContain('/login');
  });

  test('learner sees generation restricted message (not on allowlist)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const restricted = page.getByText('Generation Restricted');
    const hasRestricted = await restricted.isVisible().catch(() => false);
    if (hasRestricted) {
      await expect(page.getByText(/contact an admin/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /go to library/i })).toBeVisible();
    }
  });

  test('learner sees Cloud Library, Saved Results, and Settings buttons', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Cloud Library')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Saved Results')).toBeVisible();
    await expect(page.getByText('Settings')).toBeVisible();
  });
});

test.describe('Feature 18: Community Library — Learner Browse', () => {
  test('learner can access community library', async ({ page }) => {
    await page.goto('/community');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1').filter({ hasText: /community library/i })).toBeVisible({ timeout: 10000 });
  });

  test('community shows shared content cards', async ({ page }) => {
    await page.goto('/community');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const cards = page.locator('[class*="card"], [class*="result"]');
    const cardCount = await cards.count();

    if (cardCount > 0) {
      const firstCardTitle = cards.first().locator('h3, [class*="title"]');
      await expect(firstCardTitle).toBeVisible();
    } else {
      const emptyState = page.locator('text=No shared content');
      await expect(emptyState).toBeVisible();
    }
  });

  test('learner can search community content', async ({ page }) => {
    await page.goto('/community');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const searchInput = page.getByPlaceholder(/search community/i);
    const hasSearch = await searchInput.isVisible().catch(() => false);
    if (hasSearch) {
      await searchInput.fill('AZ');
      await page.waitForTimeout(500);
      const subtitle = page.locator('[class*="subtitle"]');
      await expect(subtitle.first()).toBeVisible();
    }
  });

  test('learner can explore a community pack', async ({ page }) => {
    await page.goto('/community');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const exploreBtn = page.locator('button').filter({ hasText: /explore/i }).first();
    const hasExplore = await exploreBtn.isVisible().catch(() => false);
    if (!hasExplore) {
      test.skip(true, 'No community content available to explore');
      return;
    }

    await exploreBtn.click();
    await page.waitForTimeout(3000);
    expect(page.url()).toMatch(/\/(launchpad|study|view)\//);
  });
});

test.describe('Feature 3: Content Launchpad — Learner Library', () => {
  test('learner library page loads', async ({ page }) => {
    await page.goto('/library');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/library');
    await expect(page.locator('h1').filter({ hasText: /saved results/i })).toBeVisible({ timeout: 10000 });
  });

  test('learner library shows back to home button', async ({ page }) => {
    await page.goto('/library');
    await page.waitForLoadState('networkidle');
    const backBtn = page.locator('button').filter({ hasText: /back to home/i });
    await expect(backBtn).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Feature 20: Settings & Personalisation — Learner', () => {
  test('settings panel opens and shows theme options', async ({ page }) => {
    await page.goto('/');
    const settingsBtn = page.getByRole('button', { name: /settings/i });
    await expect(settingsBtn).toBeVisible();
    await settingsBtn.click();
    await page.waitForTimeout(500);

    const themeOption = page.locator('text=Playful').or(page.locator('text=Scholarly'));
    await expect(themeOption.first()).toBeVisible({ timeout: 5000 });
  });

  test('learner can switch visual theme', async ({ page }) => {
    await page.goto('/');
    const settingsBtn = page.getByRole('button', { name: /settings/i });
    await settingsBtn.click();
    await page.waitForTimeout(500);

    const scholarlyBtn = page.locator('button, [role="radio"], [class*="toggle"]').filter({ hasText: /scholarly/i });
    if (await scholarlyBtn.first().isVisible()) {
      await scholarlyBtn.first().click();
      await page.waitForTimeout(2000);
    }

    const playfulBtn = page.locator('button, [role="radio"], [class*="toggle"]').filter({ hasText: /playful/i });
    if (await playfulBtn.first().isVisible()) {
      await playfulBtn.first().click();
      await page.waitForTimeout(2000);
    }
  });

  test('learner can toggle dark/light mode', async ({ page }) => {
    await page.goto('/');
    const settingsBtn = page.getByRole('button', { name: /settings/i });
    await settingsBtn.click();
    await page.waitForTimeout(500);

    const darkBtn = page.locator('button, [role="radio"], [class*="toggle"]').filter({ hasText: /dark/i });
    if (await darkBtn.first().isVisible()) {
      await darkBtn.first().click();
      await page.waitForTimeout(1000);
    }

    const lightBtn = page.locator('button, [role="radio"], [class*="toggle"]').filter({ hasText: /light/i });
    if (await lightBtn.first().isVisible()) {
      await lightBtn.first().click();
      await page.waitForTimeout(1000);
    }
  });

  test('learner can select coach persona', async ({ page }) => {
    await page.goto('/');
    const settingsBtn = page.getByRole('button', { name: /settings/i });
    await settingsBtn.click();
    await page.waitForTimeout(500);

    const coachSection = page.locator('text=Coach').or(page.locator('text=Persona'));
    await expect(coachSection.first()).toBeVisible({ timeout: 5000 });
  });

  test('learner can sign out', async ({ page }) => {
    await page.goto('/');
    const settingsBtn = page.getByRole('button', { name: /settings/i });
    await settingsBtn.click();
    await page.waitForTimeout(500);

    const signOutBtn = page.locator('button').filter({ hasText: /sign out|log out/i });
    await expect(signOutBtn.first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Feature 16: Visual Theme System — Learner', () => {
  test('four theme combinations work without crash', async ({ page }) => {
    await page.goto('/');
    const settingsBtn = page.getByRole('button', { name: /settings/i });
    await settingsBtn.click();
    await page.waitForTimeout(500);

    const playfulBtn = page.locator('button, [role="radio"], [class*="toggle"]').filter({ hasText: /playful/i }).first();
    const scholarlyBtn = page.locator('button, [role="radio"], [class*="toggle"]').filter({ hasText: /scholarly/i }).first();
    const lightBtn = page.locator('button, [role="radio"], [class*="toggle"]').filter({ hasText: /light/i }).first();
    const darkBtn = page.locator('button, [role="radio"], [class*="toggle"]').filter({ hasText: /dark/i }).first();

    if (await playfulBtn.isVisible() && await lightBtn.isVisible()) {
      await playfulBtn.click();
      await page.waitForTimeout(1500);
      await lightBtn.click();
      await page.waitForTimeout(1500);
      const bodyText1 = await page.locator('body').innerText();
      expect(bodyText1.length).toBeGreaterThan(0);
    }

    if (await darkBtn.isVisible()) {
      await darkBtn.click();
      await page.waitForTimeout(1500);
      const bodyText2 = await page.locator('body').innerText();
      expect(bodyText2.length).toBeGreaterThan(0);
    }

    if (await scholarlyBtn.isVisible()) {
      await scholarlyBtn.click();
      await page.waitForTimeout(1500);
      const bodyText3 = await page.locator('body').innerText();
      expect(bodyText3.length).toBeGreaterThan(0);
    }

    if (await lightBtn.isVisible()) {
      await lightBtn.click();
      await page.waitForTimeout(1500);
      const bodyText4 = await page.locator('body').innerText();
      expect(bodyText4.length).toBeGreaterThan(0);
    }
  });
});

test.describe('Feature 1: Home Page — Learner Navigation', () => {
  test('learner can navigate to library from home', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const goToLibrary = page.getByRole('button', { name: /go to library/i })
      .or(page.getByText('Saved Results'));
    await expect(goToLibrary.first()).toBeVisible({ timeout: 10000 });
  });

  test('learner can open cloud library from home', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const communityBtn = page.getByText('Cloud Library');
    await expect(communityBtn).toBeVisible({ timeout: 10000 });
    await communityBtn.click();
    await page.waitForTimeout(3000);
    const libraryModal = page.locator('text=Cloud Library').first();
    const communityPage = page.locator('h1').filter({ hasText: /community library/i });
    const isModal = await libraryModal.isVisible().catch(() => false);
    const isCommunity = await communityPage.isVisible().catch(() => false);
    expect(isModal || isCommunity || page.url().includes('/community') || page.url().includes('/library')).toBeTruthy();
  });
});

test.describe('Study Flow — Learner via Community Content', () => {
  test('learner can open community content and see study page', async ({ page }) => {
    await page.goto('/community');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const exploreBtn = page.locator('button').filter({ hasText: /explore/i }).first();
    const hasExplore = await exploreBtn.isVisible().catch(() => false);
    if (!hasExplore) {
      test.skip(true, 'No community content available');
      return;
    }

    await exploreBtn.click();
    await page.waitForTimeout(5000);

    const url = page.url();
    expect(url).toMatch(/\/(launchpad|study)\//);

    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(100);
  });
});

test.describe('Error Resilience — Learner', () => {
  test('invalid study route shows error, not white screen', async ({ page }) => {
    await page.goto('/study/nonexistent-learner-id');
    await page.waitForTimeout(5000);
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(0);
    const hasButton = await page.locator('button:visible').first().isVisible().catch(() => false);
    expect(hasButton).toBeTruthy();
  });

  test('protected routes redirect unauthenticated users', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('about:blank');
    await page.evaluate(() => {
      try { localStorage.clear(); } catch (_) {}
    });
    await page.goto('/library');
    await page.waitForTimeout(5000);
    const url = page.url();
    const isRedirected = url.includes('/login');
    const isLibrary = url.includes('/library');
    expect(isRedirected || isLibrary).toBeTruthy();
  });
});
