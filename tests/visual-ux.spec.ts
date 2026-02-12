import { test, expect } from '@playwright/test';

test.describe('Visual & UX Audit', () => {
  test('home page has no console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/');
    await page.waitForTimeout(2000);
    const criticalErrors = errors.filter(
      e => !e.includes('favicon') && !e.includes('404') && !e.includes('net::')
    );
    expect(criticalErrors).toEqual([]);
  });

  test('login page has no console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/login');
    await page.waitForTimeout(2000);
    const criticalErrors = errors.filter(
      e => !e.includes('favicon') && !e.includes('404') && !e.includes('net::')
    );
    expect(criticalErrors).toEqual([]);
  });

  test('signup page has no console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/signup');
    await page.waitForTimeout(2000);
    const criticalErrors = errors.filter(
      e => !e.includes('favicon') && !e.includes('404') && !e.includes('net::')
    );
    expect(criticalErrors).toEqual([]);
  });

  test('no broken images on home page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const images = page.locator('img');
    const count = await images.count();
    for (let i = 0; i < count; i++) {
      const naturalWidth = await images.nth(i).evaluate(
        (img: HTMLImageElement) => img.naturalWidth
      );
      expect(naturalWidth).toBeGreaterThan(0);
    }
  });

  test('all interactive elements have pointer cursor', async ({ page }) => {
    await page.goto('/');
    const buttons = page.locator('button:visible:not([disabled])');
    const count = await buttons.count();
    for (let i = 0; i < count; i++) {
      const cursor = await buttons.nth(i).evaluate(
        el => window.getComputedStyle(el).cursor
      );
      expect(cursor).toBe('pointer');
    }
  });

  test('input focus states are visually distinct', async ({ page }) => {
    await page.goto('/login');
    const emailInput = page.getByLabel(/email/i);
    await emailInput.blur();
    await page.waitForTimeout(100);
    const unfocusedStyle = await emailInput.evaluate(el => {
      const s = window.getComputedStyle(el);
      return { boxShadow: s.boxShadow, outline: s.outline, borderColor: s.borderColor };
    });
    await emailInput.focus();
    await page.waitForTimeout(100);
    const focusedStyle = await emailInput.evaluate(el => {
      const s = window.getComputedStyle(el);
      return { boxShadow: s.boxShadow, outline: s.outline, borderColor: s.borderColor };
    });
    const changed = focusedStyle.boxShadow !== unfocusedStyle.boxShadow
      || focusedStyle.outline !== unfocusedStyle.outline
      || focusedStyle.borderColor !== unfocusedStyle.borderColor;
    expect(changed).toBeTruthy();
  });

  test('text is readable (not too small)', async ({ page }) => {
    await page.goto('/');
    const allText = page.locator('p:visible, h1:visible, h2:visible, h3:visible, h4:visible, button:visible');
    const count = await allText.count();
    let tooSmallCount = 0;
    for (let i = 0; i < Math.min(count, 30); i++) {
      const fontSize = await allText.nth(i).evaluate(el => {
        return parseFloat(window.getComputedStyle(el).fontSize);
      });
      if (fontSize < 10) tooSmallCount++;
    }
    expect(tooSmallCount).toBeLessThanOrEqual(5);
  });
});

test.describe('Accessibility Basics', () => {
  test('all form inputs have associated labels', async ({ page }) => {
    await page.goto('/login');
    const inputs = page.locator('input[type="email"], input[type="password"], input[type="text"]');
    const count = await inputs.count();
    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const placeholder = await input.getAttribute('placeholder');
      const hasLabel = id
        ? (await page.locator(`label[for="${id}"]`).count()) > 0
        : false;
      expect(hasLabel || !!ariaLabel || !!placeholder).toBeTruthy();
    }
  });

  test('buttons have accessible names', async ({ page }) => {
    await page.goto('/');
    const buttons = page.locator('button:visible');
    const count = await buttons.count();
    for (let i = 0; i < count; i++) {
      const name = await buttons.nth(i).evaluate(el => {
        return el.textContent?.trim() || el.getAttribute('aria-label') || '';
      });
      expect(name.length).toBeGreaterThan(0);
    }
  });

  test('color contrast - text is not invisible', async ({ page }) => {
    await page.goto('/');
    const hasBg = await page.evaluate(() => {
      const el = document.querySelector('[class*="container"], [class*="hero"], body');
      if (!el) return false;
      const style = window.getComputedStyle(el);
      const bg = style.backgroundColor;
      const bgImage = style.backgroundImage;
      return bg !== 'rgba(0, 0, 0, 0)' || bgImage !== 'none';
    });
    expect(hasBg).toBeTruthy();
  });
});

test.describe('Dark Mode', () => {
  test('dark mode applies dark background to the page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /settings/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.locator('button').filter({ hasText: 'Dark' }).click();
    await page.waitForTimeout(500);
    const bgColor = await page.evaluate(() => {
      const html = document.documentElement;
      return window.getComputedStyle(html).colorScheme || html.getAttribute('data-theme') || html.className;
    });
    const isDark = bgColor.includes('dark') || await page.evaluate(() => {
      const bg = window.getComputedStyle(document.body).backgroundColor;
      const match = bg.match(/\d+/g);
      if (!match) return false;
      const [r, g, b] = match.map(Number);
      return (r + g + b) / 3 < 128;
    });
    expect(isDark).toBeTruthy();
  });

  test('dark mode has no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/');
    await page.getByRole('button', { name: /settings/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.locator('button').filter({ hasText: 'Dark' }).click();
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: /close settings/i }).click();
    await page.waitForTimeout(500);
    const criticalErrors = errors.filter(
      e => !e.includes('favicon') && !e.includes('404') && !e.includes('net::')
    );
    expect(criticalErrors).toEqual([]);
  });
});

test.describe('Keyboard Navigation', () => {
  test('Tab key moves focus through login form fields', async ({ page }) => {
    await page.goto('/login');
    const emailInput = page.getByLabel(/email/i);
    await emailInput.focus();
    await page.keyboard.press('Tab');
    const focusedId = await page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName?.toLowerCase() || '');
    expect(focusedId).toBeTruthy();
    expect(focusedId).not.toBe('body');
  });

  test('Escape key closes settings panel', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /settings/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
  });

  test('Enter key submits login form', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByLabel(/password/i).press('Enter');
    const submitBtn = page.getByRole('button', { name: /sign in/i });
    const isLoading = await submitBtn.locator('[class*="spinner"], svg[class*="spin"]').isVisible().catch(() => false);
    const isDisabled = await submitBtn.isDisabled().catch(() => false);
    const hasError = await page.locator('[class*="error"], [class*="Error"]').first().isVisible({ timeout: 8000 }).catch(() => false);
    expect(isLoading || isDisabled || hasError).toBeTruthy();
  });
});

test.describe('Responsive Design', () => {
  test('home page works on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    const input = page.getByPlaceholder('Enter any subject to learn...');
    await expect(input).toBeVisible();
    const generateBtn = page.getByRole('button', { name: /generate learning system/i });
    await expect(generateBtn).toBeVisible();
  });

  test('login page works on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login');
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('no horizontal overflow on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5);
  });

  test('home page works on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    const input = page.getByPlaceholder('Enter any subject to learn...');
    await expect(input).toBeVisible();
  });
});
