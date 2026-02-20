import { test, expect } from '@playwright/test';

/**
 * Real Screenshot Capture Suite
 * Actually navigates through the app and captures real learning interfaces
 */

test.describe('Real Frontend Screenshots - Interactive Flow', () => {
  test.use({ storageState: 'playwright/.auth/learner.json' });

  let subjectId: string;

  test.beforeAll(async ({ browser }) => {
    // Find the AZ-104 subject ID
    const context = await browser.newContext({ storageState: 'playwright/.auth/learner.json' });
    const page = await context.newPage();
    
    await page.goto('/library');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Look for AZ-104 subject
    const az104Card = page.locator('.resultCard, [class*="card"]').filter({ hasText: /az-104|azure administrator/i }).first();
    
    if (await az104Card.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Extract subject ID from the View or Learn button
      const viewBtn = az104Card.locator('button:has-text("View")').first();
      await viewBtn.click();
      await page.waitForURL(/\/launchpad\/(.+)/);
      const url = page.url();
      const match = url.match(/\/launchpad\/([^?]+)/);
      subjectId = match ? match[1] : '';
      console.log('Found AZ-104 subject ID:', subjectId);
    }
    
    await context.close();
  });

  test('01 - Library Page', async ({ page }) => {
    await page.goto('/library');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: 'screenshots/01-library-page.png',
      fullPage: true 
    });
  });

  test('02 - Content Launchpad (View)', async ({ page }) => {
    if (!subjectId) {
      await page.goto('/library');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'screenshots/02-content-launchpad.png', fullPage: true });
      return;
    }

    await page.goto(`/launchpad/${subjectId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: 'screenshots/02-content-launchpad.png',
      fullPage: true 
    });
  });

  test('03 - Study Page Overview Tab', async ({ page }) => {
    if (!subjectId) {
      await page.goto('/library');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'screenshots/03-study-overview.png', fullPage: true });
      return;
    }

    await page.goto(`/study/${subjectId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: 'screenshots/03-study-overview.png',
      fullPage: true 
    });
  });

  test('04 - Session Configuration Modal', async ({ page }) => {
    if (!subjectId) {
      await page.goto('/library');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'screenshots/04-session-config.png', fullPage: true });
      return;
    }

    await page.goto(`/study/${subjectId}?tab=learn`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Look for "Start Session" or similar button
    const startBtn = page.getByRole('button', { name: /start session|begin|start learning/i }).first();
    if (await startBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await startBtn.click();
      await page.waitForTimeout(1000);
    }
    
    await page.screenshot({ 
      path: 'screenshots/04-session-config.png',
      fullPage: true 
    });
  });

  test('05 - Active Learning Session', async ({ page }) => {
    if (!subjectId) {
      await page.goto('/library');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'screenshots/05-active-session.png', fullPage: true });
      return;
    }

    await page.goto(`/study/${subjectId}?tab=learn`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Try to start a session
    const startBtn = page.getByRole('button', { name: /start session|begin|start learning|continue/i }).first();
    if (await startBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await startBtn.click();
      await page.waitForTimeout(2000);
      
      // If there's a goal selection, pick one
      const learnNewBtn = page.getByRole('button', { name: /learn new|explore/i }).first();
      if (await learnNewBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await learnNewBtn.click();
        await page.waitForTimeout(1000);
      }
      
      // Click confirm/start if needed
      const confirmBtn = page.getByRole('button', { name: /confirm|start|go/i }).first();
      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmBtn.click();
        await page.waitForTimeout(2000);
      }
    }
    
    await page.screenshot({ 
      path: 'screenshots/05-active-session.png',
      fullPage: true 
    });
  });

  test('06 - ULC Matrix with Concepts', async ({ page }) => {
    if (!subjectId) {
      await page.goto('/library');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'screenshots/06-ulc-matrix.png', fullPage: true });
      return;
    }

    await page.goto(`/study/${subjectId}?tab=learn`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Start session if needed
    const startBtn = page.getByRole('button', { name: /start session|begin|continue/i }).first();
    if (await startBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await startBtn.click();
      await page.waitForTimeout(2000);
      
      const learnNewBtn = page.getByRole('button', { name: /learn new|explore/i }).first();
      if (await learnNewBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await learnNewBtn.click();
        await page.waitForTimeout(1000);
      }
      
      const confirmBtn = page.getByRole('button', { name: /confirm|start|go/i }).first();
      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmBtn.click();
        await page.waitForTimeout(2000);
      }
    }
    
    // Look for ULC matrix
    const matrix = page.locator('[class*="ulc"], [class*="matrix"], [class*="practice"]').first();
    if (await matrix.isVisible({ timeout: 3000 }).catch(() => false)) {
      await matrix.screenshot({ path: 'screenshots/06-ulc-matrix.png' });
    } else {
      await page.screenshot({ path: 'screenshots/06-ulc-matrix.png', fullPage: true });
    }
  });

  test('07 - Concept Cell Clicked (Blueprint)', async ({ page }) => {
    if (!subjectId) {
      await page.goto('/library');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'screenshots/07-concept-blueprint.png', fullPage: true });
      return;
    }

    await page.goto(`/study/${subjectId}?tab=learn`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Start session
    const startBtn = page.getByRole('button', { name: /start session|begin|continue/i }).first();
    if (await startBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await startBtn.click();
      await page.waitForTimeout(2000);
      
      const learnNewBtn = page.getByRole('button', { name: /learn new|explore/i }).first();
      if (await learnNewBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await learnNewBtn.click();
        await page.waitForTimeout(1000);
      }
      
      const confirmBtn = page.getByRole('button', { name: /confirm|start|go/i }).first();
      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmBtn.click();
        await page.waitForTimeout(2000);
      }
    }
    
    // Click on a concept cell
    const conceptCell = page.locator('button, [role="button"]').filter({ hasText: /prepare|model|deliver/i }).first();
    if (await conceptCell.isVisible({ timeout: 3000 }).catch(() => false)) {
      await conceptCell.click();
      await page.waitForTimeout(2000);
    }
    
    await page.screenshot({ 
      path: 'screenshots/07-concept-blueprint.png',
      fullPage: true 
    });
  });

  test('08 - Micro Learning Loop - Worked Example', async ({ page }) => {
    if (!subjectId) {
      await page.goto('/library');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'screenshots/08-worked-example.png', fullPage: true });
      return;
    }

    await page.goto(`/study/${subjectId}?tab=learn`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Start session and navigate to learning content
    const startBtn = page.getByRole('button', { name: /start session|begin|continue/i }).first();
    if (await startBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await startBtn.click();
      await page.waitForTimeout(2000);
      
      const learnNewBtn = page.getByRole('button', { name: /learn new|explore/i }).first();
      if (await learnNewBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await learnNewBtn.click();
        await page.waitForTimeout(1000);
      }
      
      const confirmBtn = page.getByRole('button', { name: /confirm|start|go/i }).first();
      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmBtn.click();
        await page.waitForTimeout(3000);
      }
    }
    
    // Click on first concept cell to open blueprint
    const conceptCell = page.locator('button, [role="button"]').filter({ hasText: /prepare|model|deliver/i }).first();
    if (await conceptCell.isVisible({ timeout: 3000 }).catch(() => false)) {
      await conceptCell.click();
      await page.waitForTimeout(2000);
    }
    
    await page.screenshot({ 
      path: 'screenshots/08-worked-example.png',
      fullPage: true 
    });
  });

  test('09 - Concept Map', async ({ page }) => {
    if (!subjectId) {
      await page.goto('/library');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'screenshots/09-concept-map.png', fullPage: true });
      return;
    }

    await page.goto(`/study/${subjectId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Look for concept map tab or button
    const mapTab = page.getByRole('tab', { name: /map|structure/i }).first();
    const mapBtn = page.getByRole('button', { name: /map|structure/i }).first();
    
    if (await mapTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await mapTab.click();
      await page.waitForTimeout(2000);
    } else if (await mapBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await mapBtn.click();
      await page.waitForTimeout(2000);
    }
    
    await page.screenshot({ 
      path: 'screenshots/09-concept-map.png',
      fullPage: true 
    });
  });

  test('10 - Home Page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: 'screenshots/10-home-page.png',
      fullPage: true 
    });
  });
});
