// The session: it survives reloads and new tabs, sign-out ends it everywhere,
// and a missing, forged or revoked session cookie means signed out.
import { expect, test, type Page } from '@playwright/test';
import {
  ADMIN_USER,
  AGENT,
  ORIGIN_HEADER,
  createAgent,
  loginHeading,
  signInViaApi,
  submitLoginForm,
} from '../helpers/auth.ts';

const SESSION_COOKIE = 'better-auth.session_token';

async function expectSignedOut(page: Page) {
  await expect(page).toHaveURL(/\/login$/);
  await expect(loginHeading(page)).toBeVisible();
  expect((await page.request.get('/api/users/me')).status()).toBe(401);
}

test.describe('an active session', () => {
  test('survives a reload and is shared with a new tab', async ({
    page,
    context,
  }) => {
    await page.goto('/login');
    await submitLoginForm(page, AGENT);
    await expect(
      page.getByRole('heading', { name: `Welcome, ${AGENT.name}` }),
    ).toBeVisible();

    await page.reload();
    await expect(
      page.getByRole('heading', { name: `Welcome, ${AGENT.name}` }),
    ).toBeVisible();

    const secondTab = await context.newPage();
    await secondTab.goto('/account');
    await expect(
      secondTab.getByRole('heading', { name: 'Account' }),
    ).toBeVisible();
    await expect(secondTab.getByText(AGENT.email)).toBeVisible();
  });

  test('is not shared with another browser context', async ({
    page,
    browser,
  }) => {
    await signInViaApi(page.request, AGENT);

    const other = await browser.newContext();
    try {
      const otherPage = await other.newPage();
      await otherPage.goto('/');
      await expectSignedOut(otherPage);
    } finally {
      await other.close();
    }
  });
});

test.describe('signing out', () => {
  test('from the sidebar ends the session, and Back shows no protected page', async ({
    page,
  }) => {
    await signInViaApi(page.request, AGENT);
    await page.goto('/');
    await page.goto('/account');
    await expect(page.getByRole('heading', { name: 'Account' })).toBeVisible();

    await page.getByRole('button', { name: 'Sign out' }).click();
    await expectSignedOut(page);

    await page.goBack();
    await expect(page).toHaveURL(/\/login$/);
    await expect(loginHeading(page)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Account' })).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: `Welcome, ${AGENT.name}` }),
    ).toHaveCount(0);

    for (const path of ['/', '/account', '/settings']) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login$/);
    }
  });

  test('from the user menu ends the session', async ({ page }) => {
    await signInViaApi(page.request, AGENT);
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

    await page.getByRole('button', { name: 'Open user menu' }).click();
    await page.getByRole('menuitem', { name: 'Sign out' }).click();

    await expectSignedOut(page);
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('revokes the session on the server, not just the cookie', async ({
    page,
    context,
  }) => {
    await signInViaApi(page.request, AGENT);
    const cookie = (await context.cookies()).find(
      (c) => c.name === SESSION_COOKIE,
    );
    expect(cookie, 'session cookie after sign-in').toBeDefined();
    await page.goto('/');

    await page.getByRole('button', { name: 'Sign out' }).click();
    await expectSignedOut(page);

    // Put the old cookie back: the session it points to is gone.
    await context.addCookies([cookie!]);
    expect((await page.request.get('/api/users/me')).status()).toBe(401);
    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('in one tab signs the other tab out on its next reload', async ({
    page,
    context,
  }) => {
    await signInViaApi(page.request, AGENT);
    await page.goto('/');
    const secondTab = await context.newPage();
    await secondTab.goto('/account');
    await expect(
      secondTab.getByRole('heading', { name: 'Account' }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Sign out' }).click();
    await expectSignedOut(page);

    await secondTab.reload();
    await expect(secondTab).toHaveURL(/\/login$/);
    await expect(loginHeading(secondTab)).toBeVisible();
  });
});

test.describe('a missing or invalid session cookie', () => {
  test('clearing cookies signs the user out', async ({ page, context }) => {
    await signInViaApi(page.request, AGENT);
    await page.goto('/account');
    await expect(page.getByRole('heading', { name: 'Account' })).toBeVisible();

    await context.clearCookies();
    await page.reload();

    await expectSignedOut(page);
  });

  test('a made-up session cookie is treated as signed out', async ({
    page,
    context,
    baseURL,
  }) => {
    await context.addCookies([
      { name: SESSION_COOKIE, value: 'not-a-real-session', url: baseURL! },
    ]);

    await page.goto('/');

    await expectSignedOut(page);
  });

  test('a tampered session cookie is treated as signed out', async ({
    page,
    context,
  }) => {
    await signInViaApi(page.request, AGENT);
    const cookie = (await context.cookies()).find(
      (c) => c.name === SESSION_COOKIE,
    );
    expect(cookie, 'session cookie after sign-in').toBeDefined();

    // The cookie is "<token>.<signature>"; change the token, keep the rest.
    const { value } = cookie!;
    const tampered = `${value.startsWith('x') ? 'y' : 'x'}${value.slice(1)}`;
    await context.addCookies([{ ...cookie!, value: tampered }]);
    await page.goto('/');

    await expectSignedOut(page);
  });
});

test.describe('an admin acting on a user', () => {
  test('revoking their sessions signs them out', async ({
    page,
    request,
  }, testInfo) => {
    await signInViaApi(request, ADMIN_USER);
    const user = await createAgent(request, testInfo);

    await signInViaApi(page.request, user);
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: `Welcome, ${user.name}` }),
    ).toBeVisible();

    const revoke = await request.post('/api/auth/admin/revoke-user-sessions', {
      data: { userId: user.id },
      headers: ORIGIN_HEADER,
    });
    expect(revoke.status()).toBe(200);

    await page.reload();
    await expectSignedOut(page);

    // They can sign in again.
    await submitLoginForm(page, user);
    await expect(
      page.getByRole('heading', { name: `Welcome, ${user.name}` }),
    ).toBeVisible();
  });

  test('banning them ends their session and blocks sign-in', async ({
    page,
    request,
  }, testInfo) => {
    await signInViaApi(request, ADMIN_USER);
    const user = await createAgent(request, testInfo);

    await page.goto('/login');
    await submitLoginForm(page, user);
    await expect(
      page.getByRole('heading', { name: `Welcome, ${user.name}` }),
    ).toBeVisible();

    const ban = await request.post('/api/auth/admin/ban-user', {
      data: { userId: user.id, banReason: 'e2e test' },
      headers: ORIGIN_HEADER,
    });
    expect(ban.status()).toBe(200);

    await page.reload();
    await expectSignedOut(page);

    // The API refuses the banned user...
    const signIn = await page.request.post('/api/auth/sign-in/email', {
      data: { email: user.email, password: user.password },
      headers: ORIGIN_HEADER,
    });
    expect(signIn.status()).toBe(403);
    expect(await signIn.json()).toMatchObject({ code: 'BANNED_USER' });

    // ...and the form tells them their account is disabled.
    await submitLoginForm(page, user);
    await expect(
      page.getByRole('alert').filter({
        hasText: 'Your account has been disabled. Contact your administrator.',
      }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
    expect((await page.request.get('/api/users/me')).status()).toBe(401);
  });
});
