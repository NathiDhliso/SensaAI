import { test, expect } from '@playwright/test';

/**
 * Screenshot Capture Suite
 * Captures all major user-facing pages and components
 */

// Helper to get a subject ID from the library
async function getSubjectId(page: any): Promise<string | null> {
  await page.goto('/library');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  // Try to find a "Learn" or "View" button
  const learnButton = page.locator('button:has-text("Learn")').first();
  const viewButton = page.locator('button:has-text("View")').first();
  
  if (await learnButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    // Extract subject ID from the button's onclick or href
    const href = await learnButton.evaluate((el: HTMLElement) => {
      const parent = el.closest('a');
      return parent?.getAttribute('href') || '';
    });
    const match = href.match(/\/study\/([^?]+)/);
    return match ? match[1] : null;
  }
  
  if (await viewButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    const href = await viewButton.evaluate((el: HTMLElement) => {
      const parent = el.closest('a');
      return parent?.getAttribute('href') || '';
    });
    const match = href.match(/\/launchpad\/([^?]+)/);
    return match ? match[1] : null;
  }
  
  return null;
}

test.describe('Frontend Screenshots - Core Learning Path', () => {
  test.use({ storageState: 'playwright/.auth/learner.json' });

  test('01 - Study Page (ULC Practice Controller)', async ({ page }) => {
    const subjectId = await getSubjectId(page);
    
    if (subjectId) {
      await page.goto(`/study/${subjectId}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    } else {
      // Fallback to library page
      await page.goto('/library');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
    }
    
    await page.screenshot({ 
      path: 'screenshots/01-study-page-ulc-controller.png',
      fullPage: true 
    });
  });

  test('02 - VelocityLearning Page', async ({ page }) => {
    const subjectId = await getSubjectId(page);
    
    if (subjectId) {
      await page.goto(`/study/${subjectId}?tab=learn`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    } else {
      await page.goto('/library');
      await page.waitForLoadState('networkidle');
    }
    
    await page.screenshot({ 
      path: 'screenshots/02-velocity-learning.png',
      fullPage: true 
    });
  });

  test('03 - ULC Matrix Grid View', async ({ page }) => {
    const subjectId = await getSubjectId(page);
    
    if (subjectId) {
      await page.goto(`/study/${subjectId}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      // Look for the ULC matrix/grid
      const matrix = page.locator('[class*="ulc"], [class*="matrix"], [class*="grid"]').first();
      if (await matrix.isVisible({ timeout: 5000 }).catch(() => false)) {
        await matrix.screenshot({ path: 'screenshots/03-ulc-matrix-grid.png' });
        return;
      }
    }
    
    await page.goto('/library');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/03-ulc-matrix-grid.png', fullPage: true });
  });

  test('04 - Micro Learning Loop', async ({ page }) => {
    const subjectId = await getSubjectId(page);
    
    if (subjectId) {
      await page.goto(`/study/${subjectId}?tab=learn`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      // Try to trigger micro-learning loop
      const startButton = page.getByRole('button', { name: /start|begin|practice/i }).first();
      if (await startButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await startButton.click();
        await page.waitForTimeout(2000);
      }
    } else {
      await page.goto('/library');
      await page.waitForLoadState('networkidle');
    }
    
    await page.screenshot({ 
      path: 'screenshots/04-micro-learning-loop.png',
      fullPage: true 
    });
  });

  test('05 - Concept Map Builder', async ({ page }) => {
    const subjectId = await getSubjectId(page);
    
    if (subjectId) {
      await page.goto(`/study/${subjectId}`);
      await page.waitForLoadState('networkidle');
      // Look for concept map button/link
      const conceptMapBtn = page.getByRole('button', { name: /concept map|map|explore/i }).first();
      if (await conceptMapBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await conceptMapBtn.click();
        await page.waitForTimeout(2000);
      }
    } else {
      await page.goto('/library');
      await page.waitForLoadState('networkidle');
    }
    
    await page.screenshot({ 
      path: 'screenshots/05-concept-map-builder.png',
      fullPage: true 
    });
  });
});

test.describe('Frontend Screenshots - Gym Activities', () => {
  test.use({ storageState: 'playwright/.auth/learner.json' });

  test('06 - Gym Activity Launcher', async ({ page }) => {
    const subjectId = await getSubjectId(page);
    
    if (subjectId) {
      await page.goto(`/launchpad/${subjectId}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    } else {
      await page.goto('/library');
      await page.waitForLoadState('networkidle');
    }
    
    await page.screenshot({ 
      path: 'screenshots/06-gym-activity-launcher.png',
      fullPage: true 
    });
  });

  test('07 - Peer Review Activity', async ({ page }) => {
    const subjectId = await getSubjectId(page);
    
    if (subjectId) {
      await page.goto(`/launchpad/${subjectId}`);
      await page.waitForLoadState('networkidle');
      const peerReviewBtn = page.getByRole('button', { name: /peer review/i }).first();
      if (await peerReviewBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await peerReviewBtn.click();
        await page.waitForTimeout(2000);
        await page.screenshot({ 
          path: 'screenshots/07-peer-review-activity.png',
          fullPage: true 
        });
        return;
      }
    }
    
    await page.goto('/library');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ 
      path: 'screenshots/07-peer-review-activity-not-found.png',
      fullPage: true 
    });
  });

  test('08 - Pre-Mortem Activity', async ({ page }) => {
    const subjectId = await getSubjectId(page);
    
    if (subjectId) {
      await page.goto(`/launchpad/${subjectId}`);
      await page.waitForLoadState('networkidle');
      const preMortemBtn = page.getByRole('button', { name: /pre-mortem|premortem/i }).first();
      if (await preMortemBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await preMortemBtn.click();
        await page.waitForTimeout(2000);
        await page.screenshot({ 
          path: 'screenshots/08-pre-mortem-activity.png',
          fullPage: true 
        });
        return;
      }
    }
    
    await page.goto('/library');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ 
      path: 'screenshots/08-pre-mortem-activity-not-found.png',
      fullPage: true 
    });
  });

  test('09 - Blank Sheet Test', async ({ page }) => {
    const subjectId = await getSubjectId(page);
    
    if (subjectId) {
      await page.goto(`/launchpad/${subjectId}`);
      await page.waitForLoadState('networkidle');
      const blankSheetBtn = page.getByRole('button', { name: /blank sheet|free recall/i }).first();
      if (await blankSheetBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await blankSheetBtn.click();
        await page.waitForTimeout(2000);
        await page.screenshot({ 
          path: 'screenshots/09-blank-sheet-test.png',
          fullPage: true 
        });
        return;
      }
    }
    
    await page.goto('/library');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ 
      path: 'screenshots/09-blank-sheet-test-not-found.png',
      fullPage: true 
    });
  });

  test('10 - Creative Transfer Activity', async ({ page }) => {
    const subjectId = await getSubjectId(page);
    
    if (subjectId) {
      await page.goto(`/launchpad/${subjectId}`);
      await page.waitForLoadState('networkidle');
      const creativeTransferBtn = page.getByRole('button', { name: /creative transfer|transfer/i }).first();
      if (await creativeTransferBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await creativeTransferBtn.click();
        await page.waitForTimeout(2000);
        await page.screenshot({ 
          path: 'screenshots/10-creative-transfer-activity.png',
          fullPage: true 
        });
        return;
      }
    }
    
    await page.goto('/library');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ 
      path: 'screenshots/10-creative-transfer-activity-not-found.png',
      fullPage: true 
    });
  });
});

test.describe('Frontend Screenshots - Dashboards & Feedback', () => {
  test.use({ storageState: 'playwright/.auth/learner.json' });

  test('11 - Mastery Dashboard', async ({ page }) => {
    const subjectId = await getSubjectId(page);
    
    if (subjectId) {
      await page.goto(`/study/${subjectId}`);
      await page.waitForLoadState('networkidle');
      // Try to complete a session to trigger mastery dashboard
      const dashboardBtn = page.getByRole('button', { name: /dashboard|mastery|summary/i }).first();
      if (await dashboardBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await dashboardBtn.click();
        await page.waitForTimeout(2000);
      }
    } else {
      await page.goto('/library');
      await page.waitForLoadState('networkidle');
    }
    
    await page.screenshot({ 
      path: 'screenshots/11-mastery-dashboard.png',
      fullPage: true 
    });
  });

  test('12 - Blueprint Formula Dashboard (Equation Monitor)', async ({ page }) => {
    const subjectId = await getSubjectId(page);
    
    if (subjectId) {
      await page.goto(`/launchpad/${subjectId}`);
      await page.waitForLoadState('networkidle');
      // Look for equation monitor component
      const equationMonitor = page.locator('[class*="equation"], [class*="blueprint"], [class*="formula"]').first();
      if (await equationMonitor.isVisible({ timeout: 3000 }).catch(() => false)) {
        await equationMonitor.screenshot({ path: 'screenshots/12-blueprint-formula-dashboard.png' });
        return;
      }
    }
    
    await page.goto('/library');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ 
      path: 'screenshots/12-blueprint-formula-dashboard.png',
      fullPage: true 
    });
  });

  test('13 - Cognitive Gauge', async ({ page }) => {
    const subjectId = await getSubjectId(page);
    
    if (subjectId) {
      await page.goto(`/study/${subjectId}`);
      await page.waitForLoadState('networkidle');
      // Look for cognitive gauge in header
      const cognitiveGauge = page.locator('[class*="cognitive"], [class*="gauge"], header').first();
      if (await cognitiveGauge.isVisible({ timeout: 3000 }).catch(() => false)) {
        await cognitiveGauge.screenshot({ path: 'screenshots/13-cognitive-gauge.png' });
        return;
      }
    }
    
    await page.goto('/library');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/13-cognitive-gauge.png', fullPage: true });
  });

  test('14 - Celebration Modal', async ({ page }) => {
    const subjectId = await getSubjectId(page);
    
    if (subjectId) {
      await page.goto(`/study/${subjectId}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
    } else {
      await page.goto('/library');
      await page.waitForLoadState('networkidle');
    }
    
    // Celebration modal appears on concept mastery - hard to trigger
    // Just capture the page state
    await page.screenshot({ 
      path: 'screenshots/14-celebration-modal-state.png',
      fullPage: true 
    });
  });

  test('15 - Neural Reset Banner', async ({ page }) => {
    const subjectId = await getSubjectId(page);
    
    if (subjectId) {
      await page.goto(`/study/${subjectId}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
      // Neural reset appears on struggle detection
      const resetBanner = page.locator('[class*="neural"], [class*="reset"], [class*="break"]').first();
      if (await resetBanner.isVisible({ timeout: 3000 }).catch(() => false)) {
        await resetBanner.screenshot({ path: 'screenshots/15-neural-reset-banner.png' });
        return;
      }
    }
    
    await page.goto('/library');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/15-neural-reset-banner.png', fullPage: true });
  });
});

test.describe('Frontend Screenshots - AI & Personalization', () => {
  test.use({ storageState: 'playwright/.auth/learner.json' });

  test('16 - AI Coach Message', async ({ page }) => {
    const subjectId = await getSubjectId(page);
    
    if (subjectId) {
      await page.goto(`/study/${subjectId}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      // Look for coach message component
      const coachMessage = page.locator('[class*="coach"], [class*="message"]').first();
      if (await coachMessage.isVisible({ timeout: 3000 }).catch(() => false)) {
        await coachMessage.screenshot({ path: 'screenshots/16-ai-coach-message.png' });
        return;
      }
    }
    
    await page.goto('/library');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/16-ai-coach-message.png', fullPage: true });
  });

  test('17 - Metaphor Toggle', async ({ page }) => {
    const subjectId = await getSubjectId(page);
    
    if (subjectId) {
      await page.goto(`/study/${subjectId}`);
      await page.waitForLoadState('networkidle');
      // Look for metaphor toggle
      const metaphorToggle = page.locator('[class*="metaphor"], button').filter({ hasText: /metaphor|scholarly/i }).first();
      if (await metaphorToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
        await metaphorToggle.screenshot({ path: 'screenshots/17-metaphor-toggle.png' });
        return;
      }
    }
    
    await page.goto('/library');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/17-metaphor-toggle.png', fullPage: true });
  });

  test('18 - Session Configuration', async ({ page }) => {
    const subjectId = await getSubjectId(page);
    
    if (subjectId) {
      await page.goto(`/study/${subjectId}`);
      await page.waitForLoadState('networkidle');
      // Look for session config (goal selection)
      const sessionConfig = page.locator('[class*="session"], [class*="config"], [class*="goal"]').first();
      if (await sessionConfig.isVisible({ timeout: 3000 }).catch(() => false)) {
        await sessionConfig.screenshot({ path: 'screenshots/18-session-configuration.png' });
        return;
      }
    }
    
    await page.goto('/library');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/18-session-configuration.png', fullPage: true });
  });
});

test.describe('Frontend Screenshots - Content Launchpad', () => {
  test.use({ storageState: 'playwright/.auth/learner.json' });

  test('19 - Content Launchpad Overview', async ({ page }) => {
    const subjectId = await getSubjectId(page);
    
    if (subjectId) {
      await page.goto(`/launchpad/${subjectId}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    } else {
      await page.goto('/library');
      await page.waitForLoadState('networkidle');
    }
    
    await page.screenshot({ 
      path: 'screenshots/19-content-launchpad-overview.png',
      fullPage: true 
    });
  });

  test('20 - Launchpad Score Card', async ({ page }) => {
    const subjectId = await getSubjectId(page);
    
    if (subjectId) {
      await page.goto(`/launchpad/${subjectId}`);
      await page.waitForLoadState('networkidle');
      const scoreCard = page.locator('[class*="score"], [class*="card"]').first();
      if (await scoreCard.isVisible({ timeout: 3000 }).catch(() => false)) {
        await scoreCard.screenshot({ path: 'screenshots/20-launchpad-score-card.png' });
        return;
      }
    }
    
    await page.goto('/library');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/20-launchpad-score-card.png', fullPage: true });
  });
});

test.describe('Frontend Screenshots - Additional Pages', () => {
  test('21 - Home Page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: 'screenshots/21-home-page.png',
      fullPage: true 
    });
  });

  test('22 - Login Page', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ 
      path: 'screenshots/22-login-page.png',
      fullPage: true 
    });
  });

  test('23 - Signup Page', async ({ page }) => {
    await page.goto('/signup');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ 
      path: 'screenshots/23-signup-page.png',
      fullPage: true 
    });
  });
});

test.describe('Frontend Screenshots - Dark Mode', () => {
  test.use({ storageState: 'playwright/.auth/learner.json' });

  test('24 - Study Page (Dark Mode)', async ({ page }) => {
    const subjectId = await getSubjectId(page);
    
    if (subjectId) {
      await page.goto(`/study/${subjectId}`);
      await page.waitForLoadState('networkidle');
      // Enable dark mode
      const settingsBtn = page.getByRole('button', { name: /settings/i });
      if (await settingsBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await settingsBtn.click();
        await page.locator('button').filter({ hasText: 'Dark' }).click();
        await page.waitForTimeout(1000);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }
    } else {
      await page.goto('/library');
      await page.waitForLoadState('networkidle');
    }
    
    await page.screenshot({ 
      path: 'screenshots/24-study-page-dark-mode.png',
      fullPage: true 
    });
  });

  test('25 - Launchpad (Dark Mode)', async ({ page }) => {
    const subjectId = await getSubjectId(page);
    
    if (subjectId) {
      await page.goto(`/launchpad/${subjectId}`);
      await page.waitForLoadState('networkidle');
      // Enable dark mode
      const settingsBtn = page.getByRole('button', { name: /settings/i });
      if (await settingsBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await settingsBtn.click();
        await page.locator('button').filter({ hasText: 'Dark' }).click();
        await page.waitForTimeout(1000);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }
    } else {
      await page.goto('/library');
      await page.waitForLoadState('networkidle');
    }
    
    await page.screenshot({ 
      path: 'screenshots/25-launchpad-dark-mode.png',
      fullPage: true 
    });
  });
});
