import { expect, test, type Page } from '@playwright/test';

const apiBaseUrl = 'http://localhost:3000/api';
const loginEmail = 'traveller@example.com';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  await page.route(`${apiBaseUrl}/**`, async (route) => {
    await route.fulfill({ json: {} });
  });
});

test.describe('login flow', () => {
  test('validates email and password before sending credentials', async ({ page }) => {
    await openLogin(page);

    await page.getByTestId('auth-continue-email').click();
    await expect(page.getByTestId('auth-error')).toHaveText('Enter a valid email address.');

    await page.getByTestId('auth-email-input').fill('TRAVELLER@EXAMPLE.COM');
    await page.getByTestId('auth-continue-email').click();

    await expect(page.getByRole('heading', { name: 'Welcome back!' })).toBeVisible();
    await expect(page.getByText(loginEmail)).toBeVisible();

    await page.getByTestId('auth-submit-password').click();

    await expect(page.getByTestId('auth-error')).toHaveText('Enter your password.');
  });

  test('shows an error when the API rejects the credentials', async ({ page }) => {
    await page.route(`${apiBaseUrl}/auth/login`, async (route) => {
      await route.fulfill({ status: 401, json: { message: 'Invalid email or password' } });
    });

    await openLogin(page);
    await continueToPassword(page);
    await page.getByTestId('auth-password-input').fill('wrong-password');

    const loginRequestPromise = page.waitForRequest(`${apiBaseUrl}/auth/login`);
    await page.getByTestId('auth-submit-password').click();

    const loginRequest = await loginRequestPromise;
    expect(loginRequest.postDataJSON()).toEqual({
      email: loginEmail,
      password: 'wrong-password',
    });
    await expect(page).toHaveURL(/\/auth$/);
    await expect(page.getByTestId('auth-error')).toHaveText('Email and password do not match. You can try again or create an account.');
  });

  test('signs in with email and password and opens setup', async ({ page }) => {
    await page.route(`${apiBaseUrl}/auth/login`, async (route) => {
      await route.fulfill({
        json: {
          accessToken: 'e2e-token',
          user: {
            id: 'user-e2e',
            displayName: 'E2E Traveller',
            initials: 'ET',
            email: loginEmail,
          },
        },
      });
    });

    await openLogin(page);
    await continueToPassword(page);
    await page.getByTestId('auth-password-input').fill('correct-password');

    const loginRequestPromise = page.waitForRequest(`${apiBaseUrl}/auth/login`);
    await page.getByTestId('auth-submit-password').click();

    const loginRequest = await loginRequestPromise;
    expect(loginRequest.postDataJSON()).toEqual({
      email: loginEmail,
      password: 'correct-password',
    });
    await expect(page).toHaveURL(/\/setup$/);
    await expect(page.getByRole('heading', { name: "See what's open today." })).toBeVisible();

    const storedSession = await page.evaluate(() => JSON.parse(window.localStorage.getItem('islandhub.auth.session') ?? 'null') as unknown);
    expect(storedSession).toMatchObject({
      mode: 'authenticated',
      accessToken: 'e2e-token',
      email: loginEmail,
    });
  });
});

async function openLogin(page: Page): Promise<void> {
  await page.goto('/auth');
  await expect(page.getByTestId('auth-screen')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Iceland, before you go.' })).toBeVisible();
}

async function continueToPassword(page: Page): Promise<void> {
  await page.getByTestId('auth-email-input').fill(loginEmail);
  await page.getByTestId('auth-continue-email').click();
  await expect(page.getByRole('heading', { name: 'Welcome back!' })).toBeVisible();
}
