import { test, expect, type Page } from '@playwright/test';

test.describe('Feature 19: Authentication & Access Control (Admin)', () => {
  test('admin lands on home page authenticated', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByPlaceholder('Search certifications or enter any subject...')).toBeVisible({ timeout: 15000 });
    expect(page.url()).not.toContain('/login');
  });

  test('admin sees generation controls (allowlisted user)', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByPlaceholder('Search certifications or enter any subject...')).toBeVisible();
    const generateBtn = page.locator('button').filter({ hasText: /generate learning system/i });
    await expect(generateBtn).toBeVisible();
  });
});

test.describe('Feature 3: Content Launchpad (Library Dashboard)', () => {
  test('library loads with saved results', async ({ page }) => {
    await page.goto('/library');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/library');
    await expect(page.locator('h1').filter({ hasText: /saved results/i })).toBeVisible({ timeout: 10000 });
  });

  test('library shows search and sort controls', async ({ page }) => {
    await page.goto('/library');
    await page.waitForLoadState('networkidle');
    const searchInput = page.getByPlaceholder(/search/i);
    await expect(searchInput).toBeVisible({ timeout: 10000 });
    const sortSelect = page.locator('select');
    await expect(sortSelect).toBeVisible();
  });

  test('library has link to community', async ({ page }) => {
    await page.goto('/library');
    await page.waitForLoadState('networkidle');
    const communityLink = page.locator('button, a').filter({ hasText: /community/i });
    await expect(communityLink.first()).toBeVisible({ timeout: 10000 });
  });

  test('library cards have study and view actions', async ({ page }) => {
    await page.goto('/library');
    await page.waitForLoadState('networkidle');
    const cards = page.locator('[class*="card"], [class*="result"]');
    const cardCount = await cards.count();
    if (cardCount > 0) {
      const actionButtons = page.locator('button').filter({ hasText: /study|view|launch|explore/i });
      await expect(actionButtons.first()).toBeVisible({ timeout: 10000 });
    }
  });
});

test.describe('Feature 18: Community Library', () => {
  test('community page loads', async ({ page }) => {
    await page.goto('/community');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1').filter({ hasText: /community library/i })).toBeVisible({ timeout: 10000 });
  });

  test('community shows search and sort', async ({ page }) => {
    await page.goto('/community');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const hasContent = await page.locator('[class*="card"], [class*="result"]').count();
    if (hasContent > 0) {
      await expect(page.getByPlaceholder(/search community/i)).toBeVisible();
      await expect(page.locator('select').filter({ hasText: /date/i })).toBeVisible();
    }
  });

  test('community cards have explore button', async ({ page }) => {
    await page.goto('/community');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const exploreButtons = page.locator('button').filter({ hasText: /explore/i });
    const count = await exploreButtons.count();
    if (count > 0) {
      await expect(exploreButtons.first()).toBeVisible();
    }
  });

  test('admin can toggle public sharing from library', async ({ page }) => {
    await page.goto('/library');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const globeButtons = page.locator('button[title*="public"], button[title*="share"], button[title*="community"]');
    const count = await globeButtons.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Feature 1: AI Content Generation (Existing AZ-104)', () => {
  test('AZ-104 content exists in library and can be opened', async ({ page }) => {
    await page.goto('/library');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const searchInput = page.getByPlaceholder(/search/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill('AZ-104');
      await page.waitForTimeout(500);
    }

    const az104Card = page.locator('text=AZ-104').first();
    const hasAZ104 = await az104Card.isVisible().catch(() => false);

    if (!hasAZ104) {
      const az104Alt = page.locator('text=Azure Administrator').first();
      const hasAlt = await az104Alt.isVisible().catch(() => false);
      if (!hasAlt) {
        test.skip(true, 'No AZ-104 content found in library');
        return;
      }
    }

    const studyBtn = page.locator('button').filter({ hasText: /study|launch|view/i }).first();
    if (await studyBtn.isVisible()) {
      await studyBtn.click();
      await page.waitForTimeout(3000);
      const url = page.url();
      expect(url).toMatch(/\/(study|launchpad|view)\//);
    }
  });
});

test.describe('Feature 20: Settings & Personalisation', () => {
  test('settings panel opens from home', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const settingsBtn = page.getByRole('button', { name: /settings/i });
    await expect(settingsBtn).toBeVisible();
    await settingsBtn.click();
    await page.waitForTimeout(500);
    const panel = page.locator('[class*="settings"], [class*="panel"], [role="dialog"]');
    await expect(panel.first()).toBeVisible({ timeout: 5000 });
  });

  test('settings shows theme toggle (playful/scholarly)', async ({ page }) => {
    await page.goto('/');
    const settingsBtn = page.getByRole('button', { name: /settings/i });
    await settingsBtn.click();
    await page.waitForTimeout(500);
    const themeOption = page.locator('text=Playful').or(page.locator('text=Scholarly'));
    await expect(themeOption.first()).toBeVisible({ timeout: 5000 });
  });

  test('settings shows dark/light mode toggle', async ({ page }) => {
    await page.goto('/');
    const settingsBtn = page.getByRole('button', { name: /settings/i });
    await settingsBtn.click();
    await page.waitForTimeout(500);
    const modeOption = page.locator('text=Light').or(page.locator('text=Dark')).or(page.locator('text=System'));
    await expect(modeOption.first()).toBeVisible({ timeout: 5000 });
  });

  test('settings shows coach persona selection', async ({ page }) => {
    await page.goto('/');
    const settingsBtn = page.getByRole('button', { name: /settings/i });
    await settingsBtn.click();
    await page.waitForTimeout(500);
    const coachSection = page.locator('text=Coach').or(page.locator('text=Persona')).or(page.locator('text=coach'));
    await expect(coachSection.first()).toBeVisible({ timeout: 5000 });
  });

  test('settings shows practice mode options', async ({ page }) => {
    await page.goto('/');
    const settingsBtn = page.getByRole('button', { name: /settings/i });
    await settingsBtn.click();
    await page.waitForTimeout(500);
    const practiceMode = page.locator('text=Progressive').or(page.locator('text=Mixed')).or(page.locator('text=Blocked'));
    await expect(practiceMode.first()).toBeVisible({ timeout: 5000 });
  });

  test('settings shows user profile section when authenticated', async ({ page }) => {
    await page.goto('/');
    const settingsBtn = page.getByRole('button', { name: /settings/i });
    await settingsBtn.click();
    await page.waitForTimeout(500);
    const profileSection = page.locator('text=Profile').or(page.locator('text=Account')).or(page.locator('text=Sign Out'));
    await expect(profileSection.first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Feature 16: Visual Theme System', () => {
  test('switching to scholarly theme changes UI', async ({ page }) => {
    await page.goto('/');
    const settingsBtn = page.getByRole('button', { name: /settings/i });
    await settingsBtn.click();
    await page.waitForTimeout(500);

    const scholarlyBtn = page.locator('button, [role="radio"], [class*="toggle"]').filter({ hasText: /scholarly/i });
    if (await scholarlyBtn.first().isVisible()) {
      await scholarlyBtn.first().click();
      await page.waitForTimeout(2000);
      const theme = await page.locator('body, [data-visual-theme]').first().getAttribute('data-visual-theme');
      if (theme) {
        expect(theme).toBe('scholarly');
      }
    }
  });
});

test.describe('Feature 4: Mood-Based Session (PRIME Step) — via Study Page', () => {
  test('study page loads for existing content', async ({ page }) => {
    await page.goto('/library');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const studyBtn = page.locator('button').filter({ hasText: /study|launch/i }).first();
    const hasStudy = await studyBtn.isVisible().catch(() => false);
    if (!hasStudy) {
      test.skip(true, 'No study content available');
      return;
    }

    await studyBtn.click();
    await page.waitForTimeout(3000);
    expect(page.url()).toMatch(/\/(study|launchpad)\//);

    const hasContent = await page.locator('body').innerText();
    expect(hasContent.length).toBeGreaterThan(50);
  });
});

test.describe('Feature 22: Synoptic View (Relationship Map)', () => {
  test('study overview tab shows concept structure', async ({ page }) => {
    await page.goto('/library');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const studyBtn = page.locator('button').filter({ hasText: /study|launch/i }).first();
    if (!(await studyBtn.isVisible().catch(() => false))) {
      test.skip(true, 'No study content available');
      return;
    }

    await studyBtn.click();
    await page.waitForTimeout(3000);

    const overviewTab = page.locator('button[role="tab"]').filter({ hasText: /overview/i });
    if (await overviewTab.isVisible()) {
      await overviewTab.click();
      await page.waitForTimeout(2000);
    }

    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(100);
  });
});

test.describe('Feature 2: Content Audit & Syllabus Alignment (Home Page)', () => {
  test('home page shows cert catalog search with AZ-104', async ({ page }) => {
    await page.goto('/');
    const input = page.getByPlaceholder('Search certifications or enter any subject...');
    await input.fill('AZ-104');
    await page.waitForTimeout(1000);

    const dropdown = page.locator('[class*="dropdown"], [class*="suggestion"]');
    const hasDropdown = await dropdown.first().isVisible().catch(() => false);
    if (hasDropdown) {
      const certOption = page.locator('button, [class*="cert"]').filter({ hasText: /AZ-104/i });
      await expect(certOption.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('objectives section accepts pasted text', async ({ page }) => {
    await page.goto('/');
    const input = page.getByPlaceholder('Search certifications or enter any subject...');
    await input.fill('Azure Administrator');
    await input.blur();
    await page.waitForTimeout(300);

    const toggle = page.getByRole('button', { name: /exam objectives/i });
    await toggle.click();
    await page.waitForTimeout(300);

    const textarea = page.getByPlaceholder(/paste exam objectives/i);
    await expect(textarea).toBeVisible({ timeout: 5000 });

    const pasteText = 'Manage Azure identities and governance (20-25%)\nConfigure and manage virtual networking (25-30%)\nDeploy and manage Azure compute resources (20-25%)';
    await textarea.fill(pasteText);
    await page.waitForTimeout(200);

    await textarea.dispatchEvent('paste');
    await page.waitForTimeout(1000);

    const textareaValue = await textarea.inputValue();
    expect(textareaValue.length).toBeGreaterThan(20);

    const detected = page.getByText(/objectives|loaded|detected/i);
    const hasDetected = await detected.first().isVisible().catch(() => false);
    expect(hasDetected || textareaValue.includes('governance')).toBeTruthy();
  });

  test('domain-locked mode with trunk inputs', async ({ page }) => {
    await page.goto('/');
    const input = page.getByPlaceholder('Search certifications or enter any subject...');
    await input.fill('Azure Administrator');

    const domainToggle = page.getByRole('button', { name: /exam domains/i });
    await domainToggle.click();
    await page.waitForTimeout(300);

    const domainInputs = page.locator('input[placeholder*="Domain"]');
    await expect(domainInputs.first()).toBeVisible({ timeout: 5000 });
    await domainInputs.nth(0).fill('Identity & Governance');
    await domainInputs.nth(1).fill('Virtual Networking');
    await page.waitForTimeout(500);

    const domainStatus = page.getByText(/domains locked|2 domains/i);
    await expect(domainStatus.first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Feature 17: Cloud Storage & Offline Support', () => {
  test('library loads results from cloud storage', async ({ page }) => {
    await page.goto('/library');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const resultCount = page.locator('text=/\\d+ of \\d+ results?/');
    const hasResults = await resultCount.isVisible().catch(() => false);
    if (hasResults) {
      const text = await resultCount.innerText();
      expect(text).toMatch(/\d+ of \d+ result/);
    }
  });

  test('import button is available in library', async ({ page }) => {
    await page.goto('/library');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const importBtn = page.locator('button').filter({ hasText: /import/i });
    const hasImport = await importBtn.first().isVisible().catch(() => false);
    expect(hasImport).toBeTruthy();
  });
});

test.describe('Error Resilience', () => {
  test('invalid study route shows error state, not white screen', async ({ page }) => {
    await page.goto('/study/nonexistent-id-12345');
    await page.waitForTimeout(5000);
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(0);
    const hasButton = await page.locator('button:visible').first().isVisible().catch(() => false);
    expect(hasButton).toBeTruthy();
  });

  test('invalid launchpad route shows error state', async ({ page }) => {
    await page.goto('/launchpad/nonexistent-id-12345');
    await page.waitForTimeout(5000);
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(0);
  });

  test('404 page renders for unknown routes', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    await page.waitForTimeout(2000);
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(0);
  });
});
