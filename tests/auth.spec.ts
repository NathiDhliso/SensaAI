import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('renders login form with all elements', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('sign in button is disabled when fields are empty', async ({ page }) => {
    const submitBtn = page.getByRole('button', { name: /sign in/i });
    await expect(submitBtn).toBeDisabled();
  });

  test('sign in button enables when both fields are filled', async ({ page }) => {
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('password123');
    const submitBtn = page.getByRole('button', { name: /sign in/i });
    await expect(submitBtn).toBeEnabled();
  });

  test('shows error when submitting with invalid credentials', async ({ page }) => {
    await page.route('**/api/v1/auth/session/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid credentials' }),
      });
    });
    await page.getByLabel(/email/i).fill('invalid@test.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.locator('[class*="error"], [class*="Error"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('password visibility toggle works', async ({ page }) => {
    const passwordInput = page.locator('#password');
    await passwordInput.fill('secret123');
    await expect(passwordInput).toHaveAttribute('type', 'password');
    const toggleBtn = passwordInput.locator('..').locator('button');
    await toggleBtn.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
  });

  test('Create one link navigates to signup', async ({ page }) => {
    await page.getByText(/create one/i).click();
    await expect(page).toHaveURL(/\/signup/);
  });

  test('visual branding elements are present', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await expect(page.getByText(/sign in to continue/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });
});

test.describe('Sign Up Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signup');
  });

  test('renders signup form with all fields', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();
    await expect(page.getByLabel(/full name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
  });

  test('shows error when submitting empty form', async ({ page }) => {
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page.locator('[class*="error"], [class*="Error"]').first()).toBeVisible({ timeout: 5000 });
  });

  test('sign in link navigates to login', async ({ page }) => {
    await page.getByText(/sign in/i).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('branding elements are present on signup', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();
    await expect(page.getByText(/begin your/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
  });
});

test.describe('Auth Redirects', () => {
  const protectedRoutes = [
    '/library',
    '/generate/TestSubject',
    '/study/some-id',
    '/launchpad/some-id',
    '/view/some-id',
  ];

  for (const route of protectedRoutes) {
    test(`accessing ${route} redirects unauthenticated user to login`, async ({ page }) => {
      await page.goto(route);
      await page.waitForURL(/\/login/);
      await expect(page).toHaveURL(/\/login/);
    });
  }
});

test.describe('Confirm Sign Up Page', () => {
  test('shows missing email error when accessed directly', async ({ page }) => {
    await page.goto('/confirm-signup');
    await expect(page.getByText(/missing email/i)).toBeVisible();
  });

  test('has link to go back to sign up', async ({ page }) => {
    await page.goto('/confirm-signup');
    const signUpLink = page.getByText(/go to sign up/i);
    await expect(signUpLink).toBeVisible();
    await signUpLink.click();
    await expect(page).toHaveURL(/\/signup/);
  });
});
