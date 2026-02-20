import { test } from '@playwright/test';

/**
 * Interactive Screenshot Capture
 * Captures real user flows through the app
 * 
 * IMPORTANT: Update SUBJECT_ID with your AZ-104 subject ID from /library
 */

// AZ-104 Subject ID from library
const SUBJECT_ID = '151e0169-7907-4ba0-8dfe-5e589eb44dc7';

test.describe('Interactive Screenshots', () => {
  test.use({ storageState: 'playwright/.auth/learner.json' });

  test('Step 1: Get Subject ID from Library', async ({ page }) => {
    await page.goto('/library');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Capture library page
    await page.screenshot({ 
      path: 'screenshots/real-01-library.png',
      fullPage: true 
    });
    
    console.log('\n=== MANUAL STEP REQUIRED ===');
    console.log('1. Look at the screenshot: screenshots/real-01-library.png');
    console.log('2. Find your AZ-104 subject');
    console.log('3. In the browser, click "View" on AZ-104');
    console.log('4. Copy the subject ID from the URL (after /launchpad/)');
    console.log('5. Update SUBJECT_ID in tests/capture-interactive.spec.ts');
    console.log('6. Re-run this test');
    console.log('============================\n');
  });

  test('Step 2: Launchpad Overview', async ({ page }) => {
    if (SUBJECT_ID === 'REPLACE_WITH_REAL_ID') {
      console.log('⚠️  Please update SUBJECT_ID first (see Step 1)');
      return;
    }

    await page.goto(`/launchpad/${SUBJECT_ID}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: 'screenshots/real-02-launchpad.png',
      fullPage: true 
    });
  });

  test('Step 3: Study Page - Overview Tab', async ({ page }) => {
    if (SUBJECT_ID === 'REPLACE_WITH_REAL_ID') {
      console.log('⚠️  Please update SUBJECT_ID first');
      return;
    }

    await page.goto(`/study/${SUBJECT_ID}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: 'screenshots/real-03-study-overview.png',
      fullPage: true 
    });
  });

  test('Step 4: Study Page - Learn Tab (Before Session)', async ({ page }) => {
    if (SUBJECT_ID === 'REPLACE_WITH_REAL_ID') {
      console.log('⚠️  Please update SUBJECT_ID first');
      return;
    }

    await page.goto(`/study/${SUBJECT_ID}?tab=learn`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: 'screenshots/real-04-learn-tab-before-session.png',
      fullPage: true 
    });
  });

  test('Step 5: Start Session - Configuration Modal', async ({ page }) => {
    if (SUBJECT_ID === 'REPLACE_WITH_REAL_ID') {
      console.log('⚠️  Please update SUBJECT_ID first');
      return;
    }

    await page.goto(`/study/${SUBJECT_ID}?tab=learn`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Click start session button
    const startBtn = page.getByRole('button', { name: /start session|begin learning|start/i }).first();
    if (await startBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await startBtn.click();
      await page.waitForTimeout(1500);
      
      await page.screenshot({ 
        path: 'screenshots/real-05-session-config-modal.png',
        fullPage: true 
      });
    } else {
      console.log('⚠️  Start session button not found');
      await page.screenshot({ 
        path: 'screenshots/real-05-session-config-modal.png',
        fullPage: true 
      });
    }
  });

  test('Step 6: Active Session - ULC Matrix', async ({ page }) => {
    if (SUBJECT_ID === 'REPLACE_WITH_REAL_ID') {
      console.log('⚠️  Please update SUBJECT_ID first');
      return;
    }

    await page.goto(`/study/${SUBJECT_ID}?tab=learn`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Start session
    const startBtn = page.getByRole('button', { name: /start session|begin learning|start|continue/i }).first();
    if (await startBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await startBtn.click();
      await page.waitForTimeout(1500);
      
      // Select "Learn New" goal
      const learnNewBtn = page.getByRole('button', { name: /learn new|explore/i }).first();
      if (await learnNewBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await learnNewBtn.click();
        await page.waitForTimeout(1000);
      }
      
      // Click confirm/start - use force click to handle animations
      const confirmBtn = page.getByRole('button', { name: /confirm|start|begin|go|let's start/i }).first();
      if (await confirmBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await confirmBtn.click({ force: true });
        await page.waitForTimeout(4000);
      }
    }
    
    await page.screenshot({ 
      path: 'screenshots/real-06-ulc-matrix-active.png',
      fullPage: true 
    });
  });

  test('Step 7: Concept Cell Clicked - Blueprint Drawer', async ({ page }) => {
    if (SUBJECT_ID === 'REPLACE_WITH_REAL_ID') {
      console.log('⚠️  Please update SUBJECT_ID first');
      return;
    }

    await page.goto(`/study/${SUBJECT_ID}?tab=learn`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Start session
    const startBtn = page.getByRole('button', { name: /start session|begin learning|start|continue/i }).first();
    if (await startBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await startBtn.click();
      await page.waitForTimeout(1500);
      
      const learnNewBtn = page.getByRole('button', { name: /learn new|explore/i }).first();
      if (await learnNewBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await learnNewBtn.click();
        await page.waitForTimeout(1000);
      }
      
      const confirmBtn = page.getByRole('button', { name: /confirm|start|begin|go|let's start/i }).first();
      if (await confirmBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await confirmBtn.click({ force: true });
        await page.waitForTimeout(4000);
      }
    }
    
    // Click on first concept cell
    const conceptCell = page.locator('button[class*="cell"], [class*="concept"], td button, [role="gridcell"] button').first();
    if (await conceptCell.isVisible({ timeout: 5000 }).catch(() => false)) {
      await conceptCell.click();
      await page.waitForTimeout(2000);
    }
    
    await page.screenshot({ 
      path: 'screenshots/real-07-blueprint-drawer.png',
      fullPage: true 
    });
  });

  test('Step 8: Concept Map', async ({ page }) => {
    if (SUBJECT_ID === 'REPLACE_WITH_REAL_ID') {
      console.log('⚠️  Please update SUBJECT_ID first');
      return;
    }

    await page.goto(`/study/${SUBJECT_ID}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Click on Structure/Map tab
    const mapTab = page.getByRole('tab', { name: /structure|map/i }).first();
    if (await mapTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await mapTab.click();
      await page.waitForTimeout(2000);
    }
    
    await page.screenshot({ 
      path: 'screenshots/real-08-concept-map.png',
      fullPage: true 
    });
  });

  test('Step 9: Home Page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    
    await page.screenshot({ 
      path: 'screenshots/real-09-home.png',
      fullPage: true 
    });
  });

  test('Step 10: Login Page', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: 'screenshots/real-10-login.png',
      fullPage: true 
    });
  });
});
