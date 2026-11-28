// Route guards: signed-out users go to /login and come back to the page they
// asked for; signed-in users skip /login; /users is for admins only.
import { expect, test } from '@playwright/test';
import {
  ADMIN_USER,
  AGENT,
  loginHeading,
  signInViaApi,
  submitLoginForm,
} from '../helpers/auth.ts';

const protectedPages = [
  { path: '/', heading: `Welcome, ${ADMIN_USER.name}` },
  { path: '/account', heading: 'Account' },
  { path: '/settings', heading: 'Settings' },
  { path: '/users', heading: 'Users' },
];

test.describe('signed-out users', () => {
  for (const { path, heading } of protectedPages) {
    test(`opening ${path} goes to /login, and signing in returns there`, async ({
      page,
    }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login$/);
      await expect(loginHeading(page)).toBeVisible();

      await submitLoginForm(page, ADMIN_USER);

      await expect(page.getByRole('heading', { name: heading })).toBeVisible();
      expect(new URL(page.url()).pathname).toBe(path);
    });
  }

  test('signing in returns to the requested query string and hash', async ({
    page,
  }) => {
    await page.goto('/settings?tab=appearance#theme');
    await expect(page).toHaveURL(/\/login$/);

    await submitLoginForm(page, AGENT);

    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    await expect(page).toHaveURL(/\/settings\?tab=appearance#theme$/);
  });

  test('an unknown route goes to /login, then home after signing in', async ({
    page,
  }) => {
    await page.goto('/no-such-page');
    await expect(page).toHaveURL(/\/login$/);

    await submitLoginForm(page, AGENT);

    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole('heading', { name: `Welcome, ${AGENT.name}` }),
    ).toBeVisible();
  });

  test('an agent sent to /login from /users ends up home, not on /users', async ({
    page,
  }) => {
    await page.goto('/users');
    await expect(page).toHaveURL(/\/login$/);

    await submitLoginForm(page, AGENT);

    await expect(
      page.getByRole('heading', { name: `Welcome, ${AGENT.name}` }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe('signed-in users', () => {
  test('opening /login redirects home', async ({ page }) => {
    await signInViaApi(page.request, AGENT);

    await page.goto('/login');

    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole('heading', { name: `Welcome, ${AGENT.name}` }),
    ).toBeVisible();
    await expect(loginHeading(page)).toHaveCount(0);
  });

  test('reloading /login after signing in elsewhere goes to the page that was asked for', async ({
    page,
  }) => {
    await page.goto('/account');
    await expect(loginHeading(page)).toBeVisible();

    // Signed in out of band (e.g. in another tab); the router state with the
    // requested page survives the reload.
    await signInViaApi(page.request, AGENT);
    await page.reload();

    await expect(page.getByRole('heading', { name: 'Account' })).toBeVisible();
    await expect(page).toHaveURL(/\/account$/);
  });

  test('an unknown route redirects home', async ({ page }) => {
    await signInViaApi(page.request, AGENT);

    await page.goto('/no-such-page');

    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole('heading', { name: `Welcome, ${AGENT.name}` }),
    ).toBeVisible();
  });
});

test.describe('the admin-only Users page', () => {
  test('an admin sees the Users link and can open the page', async ({
    page,
  }) => {
    await signInViaApi(page.request, ADMIN_USER);
    await page.goto('/');

    const nav = page.getByRole('navigation', { name: 'Main' });
    await nav.getByRole('link', { name: 'Users' }).click();

    await expect(page).toHaveURL(/\/users$/);
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();
  });

  test('an agent has no Users link, and /users sends them home', async ({
    page,
  }) => {
    await signInViaApi(page.request, AGENT);
    await page.goto('/');

    const nav = page.getByRole('navigation', { name: 'Main' });
    await expect(nav.getByRole('link', { name: 'Home' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Users' })).toHaveCount(0);

    await page.goto('/users');

    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole('heading', { name: `Welcome, ${AGENT.name}` }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Users' })).toHaveCount(0);
  });
});
