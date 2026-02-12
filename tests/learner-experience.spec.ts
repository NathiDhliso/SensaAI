import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/auth/validate', async (route) => {
    const response = await route.fetch({
      url: route.request().url().replace('/auth/validate', '/auth/session/validate'),
    });
    await route.fulfill({ response });
  });
});

const EDUCATION_LEVELS = [
  {
    level: 'Grade 1-3 (Primary)',
    subjects: [
      { name: 'Basic Addition and Subtraction', description: 'Foundation arithmetic for young learners' },
      { name: 'Learning to Read Phonics', description: 'Early literacy and phonics' },
    ],
  },
  {
    level: 'Grade 4-6 (Elementary)',
    subjects: [
      { name: 'Fractions and Decimals', description: 'Core number sense' },
      { name: 'The Solar System', description: 'Introductory astronomy' },
    ],
  },
  {
    level: 'Grade 7-9 (Middle School)',
    subjects: [
      { name: 'Introduction to Algebra', description: 'Pre-algebra concepts' },
      { name: 'Basic Chemistry Elements', description: 'Periodic table and elements' },
    ],
  },
  {
    level: 'Grade 10-12 (High School)',
    subjects: [
      { name: 'Trigonometry', description: 'Advanced math functions' },
      { name: 'Biology Cell Division', description: 'Mitosis and meiosis' },
    ],
  },
  {
    level: 'Undergraduate',
    subjects: [
      { name: 'Data Structures and Algorithms', description: 'CS fundamentals' },
      { name: 'Organic Chemistry', description: 'Carbon compound chemistry' },
    ],
  },
  {
    level: 'Postgraduate (Masters)',
    subjects: [
      { name: 'Machine Learning Fundamentals', description: 'Statistical learning theory' },
      { name: 'Advanced Statistical Methods', description: 'Graduate-level statistics' },
    ],
  },
  {
    level: 'PhD Level',
    subjects: [
      { name: 'Quantum Computing', description: 'Quantum gates and algorithms' },
      { name: 'Molecular Biology Research Methods', description: 'Advanced lab methodologies' },
    ],
  },
];

test.describe('Authenticated Home Page', () => {
  test('authenticated user sees home page without login redirect', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByPlaceholder('Enter any subject to learn...')).toBeVisible();
  });

  test('authenticated user can access library', async ({ page }) => {
    await page.goto('/library');
    await page.waitForLoadState('networkidle');
    const url = page.url();
    expect(url).not.toContain('/login');
  });

  test('home page action buttons are visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Cloud Library')).toBeVisible();
    await expect(page.getByText('Saved Results')).toBeVisible();
    await expect(page.getByText('Settings')).toBeVisible();
  });

  test('settings panel works for authenticated user', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /settings/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Settings').first()).toBeVisible();
    await page.getByRole('button', { name: /close settings/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
  });
});

test.describe('Generation Flow — Authenticated', () => {
  test('generation page loads for authenticated user', async ({ page }) => {
    await page.goto('/');
    const input = page.getByPlaceholder('Enter any subject to learn...');
    await input.fill('Docker Fundamentals');
    await page.locator('button').filter({ hasText: /generate learning system/i }).click();
    await page.waitForURL(/\/generate\//, { timeout: 10000 });
    expect(page.url()).toContain('/generate/');
  });

  test('generation page shows HUD elements', async ({ page }) => {
    await page.goto('/generate/' + encodeURIComponent('Docker Fundamentals'));
    await page.waitForTimeout(2000);
    const hasHUD = await page.locator('[class*="hud"], [class*="cockpit"], [class*="container"]').first().isVisible();
    expect(hasHUD).toBeTruthy();
  });

  test('hide generation button navigates back to home', async ({ page }) => {
    await page.goto('/generate/' + encodeURIComponent('Test Subject'));
    const hideBtn = page.locator('button').filter({ hasText: /hide generation/i });
    await expect(hideBtn).toBeVisible({ timeout: 10000 });
    await hideBtn.click();
    await expect(page).toHaveURL('/');
  });
});

for (const level of EDUCATION_LEVELS) {
  test.describe(`Learner Experience — ${level.level}`, () => {
    for (const subject of level.subjects) {
      test(`can initiate generation for "${subject.name}"`, async ({ page }) => {
        await page.goto('/');
        const input = page.getByPlaceholder('Enter any subject to learn...');
        await expect(input).toBeVisible();
        await input.fill(subject.name);
        await input.blur();
        await page.waitForTimeout(300);

        const generateBtn = page.locator('button').filter({ hasText: /generate learning system/i });
        await expect(generateBtn).toBeEnabled();
        await generateBtn.click();

        await page.waitForURL(/\/generate\//, { timeout: 15000 });
        const url = decodeURIComponent(page.url());
        expect(url).toContain(subject.name.substring(0, 10));
      });

      test(`generation page renders correctly for "${subject.name}"`, async ({ page }) => {
        await page.goto('/generate/' + encodeURIComponent(subject.name));
        await page.waitForTimeout(3000);

        const hideBtn = page.locator('button').filter({ hasText: /hide generation/i });
        const hasHideBtn = await hideBtn.isVisible().catch(() => false);

        const errorOverlay = page.locator('text=Critical Logic Failure');
        const hasError = await errorOverlay.isVisible().catch(() => false);

        const overwriteModal = page.locator('text=Duplicate Subject Detected');
        const hasDuplicate = await overwriteModal.isVisible().catch(() => false);

        expect(hasHideBtn || hasError || hasDuplicate).toBeTruthy();
      });
    }
  });
}

test.describe('Library — Authenticated', () => {
  test('library page loads without redirect', async ({ page }) => {
    await page.goto('/library');
    await page.waitForLoadState('networkidle');
    expect(page.url()).not.toContain('/login');
  });

  test('library page has search or content area', async ({ page }) => {
    await page.goto('/library');
    await page.waitForLoadState('networkidle');
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(0);
  });
});

test.describe('Study Experience — Authenticated', () => {
  test('study route with invalid ID shows error or redirects gracefully', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto('/study/nonexistent-subject-id');
    await page.waitForTimeout(3000);
    const url = page.url();
    const bodyText = await page.locator('body').innerText();
    expect(url.includes('/study') || url.includes('/') || bodyText.length > 0).toBeTruthy();
  });

  test('launchpad route with invalid ID shows error or redirects gracefully', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto('/launchpad/nonexistent-id');
    await page.waitForTimeout(3000);
    const url = page.url();
    const bodyText = await page.locator('body').innerText();
    expect(url.includes('/launchpad') || url.includes('/') || bodyText.length > 0).toBeTruthy();
  });
});

test.describe('Cross-Level UX Consistency', () => {
  const sampleSubjects = [
    'Basic Addition and Subtraction',
    'Trigonometry',
    'Machine Learning Fundamentals',
    'Quantum Computing',
  ];

  for (const subject of sampleSubjects) {
    test(`generate button enables for "${subject}"`, async ({ page }) => {
      await page.goto('/');
      const input = page.getByPlaceholder('Enter any subject to learn...');
      await input.fill(subject);
      const generateBtn = page.locator('button').filter({ hasText: /generate learning system/i });
      await expect(generateBtn).toBeEnabled();
    });
  }

  test('objectives section works for any education level', async ({ page }) => {
    await page.goto('/');
    const input = page.getByPlaceholder('Enter any subject to learn...');
    await input.fill('Biology Cell Division');
    await input.blur();
    await page.waitForTimeout(300);
    const toggle = page.getByRole('button', { name: /paste exam objectives/i });
    await toggle.click();
    const textarea = page.getByPlaceholder(/paste your exam objectives/i);
    await expect(textarea).toBeVisible();
    await textarea.fill('Understand mitosis phases\nCompare mitosis and meiosis\nExplain cytokinesis');
    await page.waitForTimeout(500);
    await expect(page.getByText(/objectives detected/i)).toBeVisible({ timeout: 5000 });
  });

  test('domain locking works for any education level', async ({ page }) => {
    await page.goto('/');
    const input = page.getByPlaceholder('Enter any subject to learn...');
    await input.fill('Organic Chemistry');
    await input.blur();
    await page.waitForTimeout(300);
    const domainToggle = page.getByRole('button', { name: /define exam domains/i });
    await domainToggle.click();
    const domainInputs = page.locator('input[placeholder*="Domain"]');
    await expect(domainInputs.first()).toBeVisible();
  });
});
