// Signing in through the login form: success for both roles, server errors,
// client-side validation, and the pending state.
import { expect, test, type Page } from '@playwright/test';
import {
  ADMIN_USER,
  AGENT,
  loginHeading,
  submitLoginForm,
} from '../helpers/auth.ts';

const SIGN_IN_PATH = '/api/auth/sign-in/email';

/** Counts sign-in requests the page sends, to prove validation blocks them. */
function countSignInRequests(page: Page) {
  const counter = { count: 0 };
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === SIGN_IN_PATH) counter.count += 1;
  });
  return counter;
}

test.describe('signing in with the login form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await expect(loginHeading(page)).toBeVisible();
  });

  test('the admin signs in, lands on home and sees their name', async ({
    page,
  }) => {
    await submitLoginForm(page, ADMIN_USER);

    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole('heading', { name: `Welcome, ${ADMIN_USER.name}` }),
    ).toBeVisible();
  });

  test('an agent signs in and lands on home', async ({ page }) => {
    await submitLoginForm(page, AGENT);

    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole('heading', { name: `Welcome, ${AGENT.name}` }),
    ).toBeVisible();
  });

  test('the user menu shows who is signed in', async ({ page }) => {
    await submitLoginForm(page, AGENT);
    await page.getByRole('button', { name: 'Open user menu' }).click();

    const menu = page.getByRole('menu');
    await expect(menu.getByText(AGENT.name)).toBeVisible();
    await expect(menu.getByText(AGENT.email)).toBeVisible();
    await expect(menu.getByText('Agent', { exact: true })).toBeVisible();
  });

  test('submitting with Enter signs in', async ({ page }) => {
    await page.getByLabel('Email').fill(AGENT.email);
    await page.getByLabel('Password').fill(AGENT.password);
    await page.getByLabel('Password').press('Enter');

    await expect(
      page.getByRole('heading', { name: `Welcome, ${AGENT.name}` }),
    ).toBeVisible();
  });

  test('a wrong password is rejected without leaking it, then the right one works', async ({
    page,
  }) => {
    const wrongPassword = 'not-the-password-123';
    await submitLoginForm(page, {
      email: AGENT.email,
      password: wrongPassword,
    });

    await expect(
      page.getByRole('alert').filter({ hasText: 'Invalid email or password.' }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
    expect(page.url()).not.toContain(wrongPassword);
    await expect(page.getByText(wrongPassword)).toHaveCount(0);
    // The button is usable again.
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled();

    await page.getByLabel('Password').fill(AGENT.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(
      page.getByRole('heading', { name: `Welcome, ${AGENT.name}` }),
    ).toBeVisible();
  });

  test('an unknown email gets the same error as a wrong password', async ({
    page,
  }) => {
    await submitLoginForm(page, {
      email: 'nobody-here@example.com',
      password: AGENT.password,
    });

    await expect(
      page.getByRole('alert').filter({ hasText: 'Invalid email or password.' }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('empty fields show both validation errors and send no request', async ({
    page,
  }) => {
    const signIns = countSignInRequests(page);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText('Enter a valid email address')).toBeVisible();
    await expect(page.getByText('Enter your password')).toBeVisible();
    await expect(page.getByLabel('Email')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    await expect(page.getByLabel('Password')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    await expect(page).toHaveURL(/\/login$/);
    expect(signIns.count).toBe(0);
  });

  test('a malformed email shows a validation error and sends no request', async ({
    page,
  }) => {
    const signIns = countSignInRequests(page);
    await submitLoginForm(page, {
      email: 'maya.thompson',
      password: AGENT.password,
    });

    await expect(page.getByText('Enter a valid email address')).toBeVisible();
    await expect(page.getByText('Enter your password')).toHaveCount(0);
    await expect(page).toHaveURL(/\/login$/);
    expect(signIns.count).toBe(0);

    // Fixing the email clears the error and signs in.
    await page.getByLabel('Email').fill(AGENT.email);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(
      page.getByRole('heading', { name: `Welcome, ${AGENT.name}` }),
    ).toBeVisible();
  });

  // signInSchema doesn't normalize the email; better-auth matches it
  // case-insensitively.
  test('the email is matched case-insensitively', async ({ page }) => {
    await submitLoginForm(page, {
      email: AGENT.email.toUpperCase(),
      password: AGENT.password,
    });

    await expect(
      page.getByRole('heading', { name: `Welcome, ${AGENT.name}` }),
    ).toBeVisible();
  });

  // A type="email" input strips leading and trailing whitespace from its
  // value (HTML value sanitization), so pasted spaces don't break sign-in.
  test('spaces around the email are ignored', async ({ page }) => {
    await submitLoginForm(page, {
      email: `  ${AGENT.email}  `,
      password: AGENT.password,
    });

    await expect(
      page.getByRole('heading', { name: `Welcome, ${AGENT.name}` }),
    ).toBeVisible();
  });

  test('the button shows "Signing in…" and is disabled while the request runs', async ({
    page,
  }) => {
    let release: () => void = () => {};
    const held = new Promise<void>((resolve) => (release = resolve));
    await page.route(`**${SIGN_IN_PATH}`, async (route) => {
      await held;
      await route.continue();
    });

    await submitLoginForm(page, AGENT);
    await expect(
      page.getByRole('button', { name: 'Signing in…' }),
    ).toBeDisabled();

    release();
    await expect(
      page.getByRole('heading', { name: `Welcome, ${AGENT.name}` }),
    ).toBeVisible();
  });

  test('a server error shows a generic message', async ({ page }) => {
    await page.route(`**${SIGN_IN_PATH}`, (route) =>
      route.fulfill({ status: 500, json: { message: 'boom' } }),
    );

    await submitLoginForm(page, AGENT);

    await expect(
      page
        .getByRole('alert')
        .filter({ hasText: 'Something went wrong. Please try again.' }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('an unreachable server shows a connection message', async ({ page }) => {
    await page.route(`**${SIGN_IN_PATH}`, (route) => route.abort('failed'));

    await submitLoginForm(page, AGENT);

    await expect(
      page.getByRole('alert').filter({
        hasText: 'Could not reach the server. Please try again.',
      }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });
});
