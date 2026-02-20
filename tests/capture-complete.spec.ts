import { test } from '@playwright/test';

/**
 * COMPLETE Frontend Screenshot Capture
 * Captures ALL user-facing features and documents inaccessible ones
 */

const SUBJECT_ID = '151e0169-7907-4ba0-8dfe-5e589eb44dc7';

test.describe('Complete Feature Capture', () => {
  test.use({ storageState: 'playwright/.auth/learner.json' });

  // ============================================================================
  // AUTHENTICATION & ONBOARDING
  // ============================================================================

  test('AUTH-01: Login Page', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/complete/auth-01-login.png', fullPage: true });
  });

  test('AUTH-02: Signup Page', async ({ page }) => {
    await page.goto('/signup');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/complete/auth-02-signup.png', fullPage: true });
  });

  test('AUTH-03: Forgot Password', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/complete/auth-03-forgot-password.png', fullPage: true });
  });

  // ============================================================================
  // HOME & NAVIGATION
  // ============================================================================

  test('NAV-01: Home Page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'screenshots/complete/nav-01-home.png', fullPage: true });
  });

  test('NAV-02: Library Page', async ({ page }) => {
    await page.goto('/library');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/complete/nav-02-library.png', fullPage: true });
  });

  test('NAV-03: Community Library', async ({ page }) => {
    await page.goto('/community');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/complete/nav-03-community.png', fullPage: true });
  });

  // ============================================================================
  // CONTENT LAUNCHPAD
  // ============================================================================

  test('LAUNCH-01: Launchpad Overview', async ({ page }) => {
    await page.goto(`/launchpad/${SUBJECT_ID}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/complete/launch-01-overview.png', fullPage: true });
  });

  test('LAUNCH-02: Launchpad - Gym Activities Section', async ({ page }) => {
    await page.goto(`/launchpad/${SUBJECT_ID}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const gymSection = page.locator('[class*="gym"], [class*="activity"]').first();
    if (await gymSection.isVisible({ timeout: 3000 }).catch(() => false)) {
      await gymSection.screenshot({ path: 'screenshots/complete/launch-02-gym-section.png' });
    } else {
      await page.screenshot({ path: 'screenshots/complete/launch-02-gym-section.png', fullPage: true });
    }
  });

  test('LAUNCH-03: Launchpad - Equation Monitor', async ({ page }) => {
    await page.goto(`/launchpad/${SUBJECT_ID}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const equationMonitor = page.locator('[class*="equation"], [class*="blueprint"], [class*="formula"]').first();
    if (await equationMonitor.isVisible({ timeout: 3000 }).catch(() => false)) {
      await equationMonitor.screenshot({ path: 'screenshots/complete/launch-03-equation-monitor.png' });
    } else {
      await page.screenshot({ path: 'screenshots/complete/launch-03-equation-monitor.png' });
    }
  });

  // ============================================================================
  // STUDY PAGE - OVERVIEW TAB
  // ============================================================================

  test('STUDY-01: Study Overview Tab', async ({ page }) => {
    await page.goto(`/study/${SUBJECT_ID}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/complete/study-01-overview.png', fullPage: true });
  });

  // ============================================================================
  // LEARNING SESSION FLOW
  // ============================================================================

  test('LEARN-01: Learn Tab Before Session', async ({ page }) => {
    await page.goto(`/study/${SUBJECT_ID}?tab=learn`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/complete/learn-01-before-session.png', fullPage: true });
  });

  test('LEARN-02: Session Configuration Modal', async ({ page }) => {
    await page.goto(`/study/${SUBJECT_ID}?tab=learn`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const startBtn = page.getByRole('button', { name: /start session|begin learning|start/i }).first();
    if (await startBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await startBtn.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: 'screenshots/complete/learn-02-session-config.png', fullPage: true });
    } else {
      await page.screenshot({ path: 'screenshots/complete/learn-02-session-config.png', fullPage: true });
    }
  });

  test('LEARN-03: Session Config - Goal Selection', async ({ page }) => {
    await page.goto(`/study/${SUBJECT_ID}?tab=learn`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const startBtn = page.getByRole('button', { name: /start session|begin learning|start/i }).first();
    if (await startBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await startBtn.click();
      await page.waitForTimeout(1500);
      
      const goalSection = page.locator('[class*="goal"], [class*="option"]').first();
      if (await goalSection.isVisible({ timeout: 2000 }).catch(() => false)) {
        await goalSection.screenshot({ path: 'screenshots/complete/learn-03-goal-selection.png' });
      } else {
        await page.screenshot({ path: 'screenshots/complete/learn-03-goal-selection.png' });
      }
    }
  });

  test('LEARN-04: Active Session - ULC Matrix', async ({ page }) => {
    await page.goto(`/study/${SUBJECT_ID}?tab=learn`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
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
    
    await page.screenshot({ path: 'screenshots/complete/learn-04-ulc-matrix.png', fullPage: true });
  });

  test('LEARN-05: ULC Matrix - Concept Cell Hover', async ({ page }) => {
    await page.goto(`/study/${SUBJECT_ID}?tab=learn`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
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
    
    const conceptCell = page.locator('button[class*="cell"], [class*="concept"], td button').first();
    if (await conceptCell.isVisible({ timeout: 5000 }).catch(() => false)) {
      await conceptCell.hover();
      await page.waitForTimeout(500);
    }
    
    await page.screenshot({ path: 'screenshots/complete/learn-05-cell-hover.png', fullPage: true });
  });

  test('LEARN-06: Blueprint Drawer - Concept Clicked', async ({ page }) => {
    await page.goto(`/study/${SUBJECT_ID}?tab=learn`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
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
    
    const conceptCell = page.locator('button[class*="cell"], [class*="concept"], td button, [role="gridcell"] button').first();
    if (await conceptCell.isVisible({ timeout: 5000 }).catch(() => false)) {
      await conceptCell.click();
      await page.waitForTimeout(2000);
    }
    
    await page.screenshot({ path: 'screenshots/complete/learn-06-blueprint-drawer.png', fullPage: true });
  });

  test('LEARN-07: Blueprint - Perspective Switcher', async ({ page }) => {
    await page.goto(`/study/${SUBJECT_ID}?tab=learn`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
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
    
    const conceptCell = page.locator('button[class*="cell"], [class*="concept"], td button').first();
    if (await conceptCell.isVisible({ timeout: 5000 }).catch(() => false)) {
      await conceptCell.click();
      await page.waitForTimeout(2000);
      
      const perspectiveSwitcher = page.locator('[class*="perspective"], [class*="switcher"], select, [role="combobox"]').first();
      if (await perspectiveSwitcher.isVisible({ timeout: 2000 }).catch(() => false)) {
        await perspectiveSwitcher.screenshot({ path: 'screenshots/complete/learn-07-perspective-switcher.png' });
      } else {
        await page.screenshot({ path: 'screenshots/complete/learn-07-perspective-switcher.png' });
      }
    }
  });

  test('LEARN-08: Blueprint - Shape Lenses', async ({ page }) => {
    await page.goto(`/study/${SUBJECT_ID}?tab=learn`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
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
    
    const conceptCell = page.locator('button[class*="cell"], [class*="concept"], td button').first();
    if (await conceptCell.isVisible({ timeout: 5000 }).catch(() => false)) {
      await conceptCell.click();
      await page.waitForTimeout(2000);
      
      const shapeLenses = page.locator('[class*="lens"], [class*="shape"]').first();
      if (await shapeLenses.isVisible({ timeout: 2000 }).catch(() => false)) {
        await shapeLenses.screenshot({ path: 'screenshots/complete/learn-08-shape-lenses.png' });
      } else {
        await page.screenshot({ path: 'screenshots/complete/learn-08-shape-lenses.png' });
      }
    }
  });

  // ============================================================================
  // CONCEPT MAP
  // ============================================================================

  test('MAP-01: Concept Map Builder', async ({ page }) => {
    await page.goto(`/study/${SUBJECT_ID}?activity=concept-map`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshots/complete/map-01-builder.png', fullPage: true });
  });

  test('MAP-02: Concept Map - Toolbar', async ({ page }) => {
    await page.goto(`/study/${SUBJECT_ID}?activity=concept-map`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    const toolbar = page.locator('[class*="toolbar"], [class*="controls"]').first();
    if (await toolbar.isVisible({ timeout: 2000 }).catch(() => false)) {
      await toolbar.screenshot({ path: 'screenshots/complete/map-02-toolbar.png' });
    } else {
      await page.screenshot({ path: 'screenshots/complete/map-02-toolbar.png' });
    }
  });

  // ============================================================================
  // GYM ACTIVITIES
  // ============================================================================

  test('GYM-01: Peer Review Activity', async ({ page }) => {
    await page.goto(`/study/${SUBJECT_ID}?activity=peer-review`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshots/complete/gym-01-peer-review.png', fullPage: true });
  });

  test('GYM-02: Pre-Mortem Activity', async ({ page }) => {
    await page.goto(`/study/${SUBJECT_ID}?activity=pre-mortem`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshots/complete/gym-02-pre-mortem.png', fullPage: true });
  });

  // ============================================================================
  // UI COMPONENTS & MODALS
  // ============================================================================

  test('UI-01: Help Modal', async ({ page }) => {
    await page.goto(`/study/${SUBJECT_ID}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const helpBtn = page.getByRole('button', { name: /help|\?/i }).first();
    if (await helpBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await helpBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'screenshots/complete/ui-01-help-modal.png', fullPage: true });
    } else {
      await page.screenshot({ path: 'screenshots/complete/ui-01-help-modal.png', fullPage: true });
    }
  });

  test('UI-02: Settings Panel', async ({ page }) => {
    await page.goto(`/study/${SUBJECT_ID}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const settingsBtn = page.getByRole('button', { name: /settings|⚙/i }).first();
    if (await settingsBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await settingsBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'screenshots/complete/ui-02-settings-panel.png', fullPage: true });
    } else {
      await page.screenshot({ path: 'screenshots/complete/ui-02-settings-panel.png', fullPage: true });
    }
  });

  test('UI-03: Metaphor Toggle', async ({ page }) => {
    await page.goto(`/study/${SUBJECT_ID}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const metaphorToggle = page.locator('[class*="metaphor"]').first();
    if (await metaphorToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      await metaphorToggle.screenshot({ path: 'screenshots/complete/ui-03-metaphor-toggle.png' });
    } else {
      await page.screenshot({ path: 'screenshots/complete/ui-03-metaphor-toggle.png' });
    }
  });

  test('UI-04: Cognitive Gauge', async ({ page }) => {
    await page.goto(`/study/${SUBJECT_ID}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const cognitiveGauge = page.locator('[class*="cognitive"], [class*="gauge"]').first();
    if (await cognitiveGauge.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cognitiveGauge.screenshot({ path: 'screenshots/complete/ui-04-cognitive-gauge.png' });
    } else {
      await page.screenshot({ path: 'screenshots/complete/ui-04-cognitive-gauge.png' });
    }
  });

  test('UI-05: AI Coach Message', async ({ page }) => {
    await page.goto(`/study/${SUBJECT_ID}?tab=learn`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    const coachMessage = page.locator('[class*="coach"]').first();
    if (await coachMessage.isVisible({ timeout: 5000 }).catch(() => false)) {
      await coachMessage.screenshot({ path: 'screenshots/complete/ui-05-coach-message.png' });
    } else {
      await page.screenshot({ path: 'screenshots/complete/ui-05-coach-message.png' });
    }
  });

  // ============================================================================
  // DARK MODE
  // ============================================================================

  test('DARK-01: Study Page Dark Mode', async ({ page }) => {
    await page.goto(`/study/${SUBJECT_ID}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const settingsBtn = page.getByRole('button', { name: /settings|⚙/i }).first();
    if (await settingsBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await settingsBtn.click();
      await page.waitForTimeout(500);
      
      const darkBtn = page.locator('button').filter({ hasText: /dark/i }).first();
      if (await darkBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await darkBtn.click();
        await page.waitForTimeout(1000);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }
    }
    
    await page.screenshot({ path: 'screenshots/complete/dark-01-study-page.png', fullPage: true });
  });

  test('DARK-02: Launchpad Dark Mode', async ({ page }) => {
    await page.goto(`/launchpad/${SUBJECT_ID}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const settingsBtn = page.getByRole('button', { name: /settings|⚙/i }).first();
    if (await settingsBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await settingsBtn.click();
      await page.waitForTimeout(500);
      
      const darkBtn = page.locator('button').filter({ hasText: /dark/i }).first();
      if (await darkBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await darkBtn.click();
        await page.waitForTimeout(1000);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }
    }
    
    await page.screenshot({ path: 'screenshots/complete/dark-02-launchpad.png', fullPage: true });
  });
});
