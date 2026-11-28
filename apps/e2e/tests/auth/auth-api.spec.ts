// The API enforces auth on its own (the web guards are UI only): sessions
// for protected routes, no self-service sign-up, and admin-only endpoints.
import { expect, test } from '@playwright/test';
import {
  ADMIN_USER,
  AGENT,
  ORIGIN_HEADER,
  createAgent,
  findUsersByEmail,
  signInViaApi,
  uniqueEmail,
} from '../helpers/auth.ts';

test.describe('without a session', () => {
  test('/api/health is public', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);
  });

  test('/api/users/me is refused with 401', async ({ request }) => {
    const response = await request.get('/api/users/me');
    expect(response.status()).toBe(401);
  });

  test('get-session returns no session', async ({ request }) => {
    const response = await request.get('/api/auth/get-session');
    expect(response.status()).toBe(200);
    expect(await response.json()).toBeNull();
  });

  test('admin endpoints are refused with 401', async ({ request }) => {
    const list = await request.get('/api/auth/admin/list-users');
    expect(list.status()).toBe(401);
  });
});

test.describe('with a session', () => {
  test('/api/users/me returns the signed-in agent', async ({ request }) => {
    await signInViaApi(request, AGENT);

    const response = await request.get('/api/users/me');

    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({
      name: AGENT.name,
      email: AGENT.email,
      role: 'agent',
    });
  });

  test('/api/users/me returns the admin role for the admin', async ({
    request,
  }) => {
    await signInViaApi(request, ADMIN_USER);

    const response = await request.get('/api/users/me');

    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({
      email: ADMIN_USER.email,
      role: 'admin',
    });
  });

  test('a wrong password is refused with 401 and sets no cookie', async ({
    request,
  }) => {
    const response = await request.post('/api/auth/sign-in/email', {
      data: { email: AGENT.email, password: 'not-the-password-123' },
      headers: ORIGIN_HEADER,
    });

    expect(response.status()).toBe(401);
    expect(response.headers()['set-cookie']).toBeUndefined();
    expect((await request.get('/api/users/me')).status()).toBe(401);
  });
});

// better-auth checks the Origin of state-changing requests against
// trustedOrigins (WEB_ORIGIN), so another site can't sign users in or out.
test.describe('Origin and CSRF checks', () => {
  const FOREIGN_ORIGIN = { Origin: 'https://evil.example.com' };

  test('sign-in from a foreign Origin is refused and sets no cookie', async ({
    request,
  }) => {
    const response = await request.post('/api/auth/sign-in/email', {
      data: { email: AGENT.email, password: AGENT.password },
      headers: FOREIGN_ORIGIN,
    });

    expect(response.status()).toBe(403);
    expect(await response.json()).toMatchObject({ code: 'INVALID_ORIGIN' });
    expect(response.headers()['set-cookie']).toBeUndefined();
    expect((await request.get('/api/users/me')).status()).toBe(401);
  });

  test('sign-out from a foreign Origin is refused and the session keeps working', async ({
    request,
  }) => {
    await signInViaApi(request, AGENT);

    const response = await request.post('/api/auth/sign-out', {
      data: {},
      headers: FOREIGN_ORIGIN,
    });

    expect(response.status()).toBe(403);
    expect(await response.json()).toMatchObject({ code: 'INVALID_ORIGIN' });
    expect((await request.get('/api/users/me')).status()).toBe(200);
  });

  // A cookie-bearing POST must say where it comes from: with no Origin (or
  // Referer) it is refused, so a CSRF can't get through by omitting it.
  test('a cookie-bearing request without an Origin is refused', async ({
    request,
  }) => {
    await signInViaApi(request, AGENT);

    const response = await request.post('/api/auth/sign-out', { data: {} });

    expect(response.status()).toBe(403);
    expect(await response.json()).toMatchObject({
      code: 'MISSING_OR_NULL_ORIGIN',
    });
    expect((await request.get('/api/users/me')).status()).toBe(200);
  });

  test('sign-out from the web app Origin works', async ({ request }) => {
    await signInViaApi(request, AGENT);

    const response = await request.post('/api/auth/sign-out', {
      data: {},
      headers: ORIGIN_HEADER,
    });

    expect(response.status()).toBe(200);
    expect((await request.get('/api/users/me')).status()).toBe(401);
  });
});

test.describe('sign-up', () => {
  test('is disabled and creates no account', async ({
    request,
    playwright,
    baseURL,
  }, testInfo) => {
    const email = uniqueEmail(testInfo, 'signup');
    const password = 'correct-horse-battery';

    const signUp = await request.post('/api/auth/sign-up/email', {
      data: { email, password, name: 'Jordan Ellis' },
      headers: ORIGIN_HEADER,
    });
    expect(signUp.status()).toBe(400);
    expect(await signUp.json()).toMatchObject({
      code: 'EMAIL_PASSWORD_SIGN_UP_DISABLED',
    });
    expect(signUp.headers()['set-cookie']).toBeUndefined();

    // The would-be account can't sign in...
    const signIn = await request.post('/api/auth/sign-in/email', {
      data: { email, password },
      headers: ORIGIN_HEADER,
    });
    expect(signIn.status()).toBe(401);

    // ...and doesn't exist.
    const admin = await playwright.request.newContext({ baseURL });
    try {
      await signInViaApi(admin, ADMIN_USER);
      expect(await findUsersByEmail(admin, email)).toEqual([]);
    } finally {
      await admin.dispose();
    }
  });
});

test.describe('admin endpoints', () => {
  test('the admin can list users', async ({ request }) => {
    await signInViaApi(request, ADMIN_USER);

    const users = await findUsersByEmail(request, AGENT.email);

    expect(users).toHaveLength(1);
  });

  test('an agent is refused listing and creating users', async ({
    request,
    playwright,
    baseURL,
  }, testInfo) => {
    await signInViaApi(request, AGENT);
    const email = uniqueEmail(testInfo, 'by-agent');

    const list = await request.get('/api/auth/admin/list-users');
    expect(list.status()).toBe(403);

    const create = await request.post('/api/auth/admin/create-user', {
      data: { email, password: 'correct-horse-battery', name: 'Not Allowed' },
      headers: ORIGIN_HEADER,
    });
    expect(create.status()).toBe(403);

    const admin = await playwright.request.newContext({ baseURL });
    try {
      await signInViaApi(admin, ADMIN_USER);
      expect(await findUsersByEmail(admin, email)).toEqual([]);
    } finally {
      await admin.dispose();
    }
  });

  // A throwaway agent, so a regression can't promote or ban a seeded user.
  test('an agent can neither make themselves admin nor ban anyone', async ({
    request,
    playwright,
    baseURL,
  }, testInfo) => {
    await signInViaApi(request, ADMIN_USER);
    const agent = await createAgent(request, testInfo);
    const victim = await createAgent(request, testInfo);

    const agentRequest = await playwright.request.newContext({ baseURL });
    try {
      await signInViaApi(agentRequest, agent);

      const setRole = await agentRequest.post('/api/auth/admin/set-role', {
        data: { userId: agent.id, role: 'admin' },
        headers: ORIGIN_HEADER,
      });
      expect(setRole.status()).toBe(403);

      const ban = await agentRequest.post('/api/auth/admin/ban-user', {
        data: { userId: victim.id },
        headers: ORIGIN_HEADER,
      });
      expect(ban.status()).toBe(403);

      const me = await agentRequest.get('/api/users/me');
      expect(await me.json()).toMatchObject({ role: 'agent' });
    } finally {
      await agentRequest.dispose();
    }

    // The other user was not banned: they can still sign in.
    const victimRequest = await playwright.request.newContext({ baseURL });
    try {
      await signInViaApi(victimRequest, victim);
    } finally {
      await victimRequest.dispose();
    }
  });
});
