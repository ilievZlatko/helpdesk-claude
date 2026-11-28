// Sign-in helpers and throwaway users for the e2e tests.
import { randomUUID } from 'node:crypto';
import {
  expect,
  type APIRequestContext,
  type Page,
  type TestInfo,
} from '@playwright/test';
import { ADMIN, SEED_USER_PASSWORD, WEB_URL } from '../../env.ts';

export type Credentials = { email: string; password: string };

/** The seeded admin, with the name the seed gives it. */
export const ADMIN_USER = { ...ADMIN, name: 'Helpdesk Admin' };

/**
 * A seeded agent (first entry of SEED_USERS in apps/api/prisma/seed-users.ts,
 * which can't be imported here: it pulls in the API's sources). Sign in with
 * it, but never change it: other tests rely on it.
 */
export const AGENT = {
  name: 'Maya Thompson',
  email: 'maya.thompson@example.com',
  password: SEED_USER_PASSWORD,
};

/**
 * Header for state-changing auth requests. The browser sends it on its own;
 * Playwright's API client doesn't, and better-auth checks it against
 * trustedOrigins (outside NODE_ENV=test).
 */
export const ORIGIN_HEADER = { Origin: WEB_URL };

/** Unique per test, per retry and per repeat. */
export function uniqueEmail(testInfo: TestInfo, prefix = 'user'): string {
  return `${prefix}-${Date.now()}-${testInfo.retry}-${randomUUID().slice(0, 8)}@example.com`;
}

/**
 * Signs in through better-auth's API. With `page.request`, the session cookie
 * is shared with the page, so a following `page.goto()` is signed in.
 */
export async function signInViaApi(
  request: APIRequestContext,
  { email, password }: Credentials,
): Promise<void> {
  const response = await request.post('/api/auth/sign-in/email', {
    data: { email, password },
    headers: ORIGIN_HEADER,
  });
  expect(response.status(), `sign-in as ${email}`).toBe(200);
}

/** The login page's heading: use it to tell that the page is /login. */
export function loginHeading(page: Page) {
  return page.getByRole('heading', { level: 1, name: 'Welcome back' });
}

/** Fills in and submits the login form (the page must be on /login). */
export async function submitLoginForm(
  page: Page,
  { email, password }: Credentials,
): Promise<void> {
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

export type TestUser = Credentials & { id: string; name: string };

/**
 * Creates a throwaway agent through the admin API. `adminRequest` must be
 * signed in as an admin (use the `request` fixture, so the admin's cookie
 * stays out of the page).
 */
export async function createAgent(
  adminRequest: APIRequestContext,
  testInfo: TestInfo,
): Promise<TestUser> {
  const email = uniqueEmail(testInfo, 'agent');
  const password = `pw-${randomUUID()}`;
  const name = 'Throwaway Agent';
  const response = await adminRequest.post('/api/auth/admin/create-user', {
    data: { email, password, name, role: 'agent' },
    headers: ORIGIN_HEADER,
  });
  expect(response.status(), `create user ${email}`).toBe(200);
  const { user } = (await response.json()) as { user: { id: string } };
  return { id: user.id, email, password, name };
}

/** Looks up users by exact email through the admin API (`adminRequest` must be an admin). */
export async function findUsersByEmail(
  adminRequest: APIRequestContext,
  email: string,
): Promise<{ email: string }[]> {
  const response = await adminRequest.get('/api/auth/admin/list-users', {
    params: { searchField: 'email', searchValue: email },
  });
  expect(response.status()).toBe(200);
  const { users } = (await response.json()) as { users: { email: string }[] };
  return users.filter((user) => user.email === email);
}
