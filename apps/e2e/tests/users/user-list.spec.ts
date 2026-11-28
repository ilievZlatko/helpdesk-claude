// The admin's user list: /users shows every user with their role and status,
// sorted by name, and GET /api/users serves it to admins only. The route
// guard and the sidebar link are covered in tests/auth/route-guards.spec.ts.
import { UserRole, UserStatus } from '@helpdesk/shared';
import { expect, test, type Page, type Route } from '@playwright/test';
import {
  ADMIN_USER,
  AGENT,
  SEED_AGENTS,
  banUser,
  createAgent,
  signInViaApi,
} from '../helpers/auth.ts';
import {
  fetchUserList,
  openUsersPage,
  userRow,
  userRows,
  usersTable,
  visibleEmails,
} from '../helpers/users.ts';

/** Plain code-point order; the names and emails compared here are ASCII. */
function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** A badge in a row: exact text, so "Agent" doesn't match "Throwaway Agent". */
function badge(page: Page, email: string, label: string) {
  return userRow(page, email)
    .getByText(label, { exact: true })
    .filter({ visible: true });
}

const seededUsers = [
  {
    name: ADMIN_USER.name,
    email: ADMIN_USER.email,
    role: UserRole.Admin,
    roleLabel: 'Admin',
  },
  ...SEED_AGENTS.map(({ name, email }) => ({
    name,
    email,
    role: UserRole.Agent,
    roleLabel: 'Agent',
  })),
];

test.describe('the user list', () => {
  test.beforeEach(async ({ page }) => {
    await signInViaApi(page.request, ADMIN_USER);
  });

  test('shows the seeded admin and agents with their role and status, and marks the admin as "(you)"', async ({
    page,
  }) => {
    await openUsersPage(page);
    await expect(page.getByText('All users')).toBeVisible();

    for (const { name, email, roleLabel } of seededUsers) {
      const row = userRow(page, email);
      await expect(row).toHaveCount(1);
      await expect(row.getByText(name, { exact: true })).toBeVisible();
      await expect(row.getByText(email, { exact: true })).toBeVisible();
      await expect(badge(page, email, roleLabel)).toHaveCount(1);
      await expect(badge(page, email, 'Active')).toHaveCount(1);
    }

    await expect(
      userRow(page, ADMIN_USER.email).getByText('(you)'),
    ).toBeVisible();
    await expect(userRows(page).filter({ hasText: '(you)' })).toHaveCount(1);
  });

  test('lists users sorted by name', async ({ page }, testInfo) => {
    // A throwaway user, so the list isn't only seeded users.
    await createAgent(page.request, testInfo);
    await openUsersPage(page);

    const byEmail = new Map(
      (await fetchUserList(page.request)).map((user) => [
        user.email,
        user.name,
      ]),
    );
    const emails = await visibleEmails(page);
    for (const { email } of seededUsers) expect(emails).toContain(email);

    const names = emails.map((email) => byEmail.get(email) ?? '');
    expect(names).toEqual([...names].sort(compare));
  });

  test('shows a banned user as Deactivated and an unbanned one as Active', async ({
    page,
  }, testInfo) => {
    const banned = await createAgent(page.request, testInfo);
    const active = await createAgent(page.request, testInfo);
    await banUser(page.request, banned.id);

    await openUsersPage(page);

    await expect(badge(page, banned.email, 'Deactivated')).toHaveCount(1);
    await expect(badge(page, banned.email, 'Active')).toHaveCount(0);
    await expect(badge(page, banned.email, 'Agent')).toHaveCount(1);

    await expect(badge(page, active.email, 'Active')).toHaveCount(1);
    await expect(badge(page, active.email, 'Deactivated')).toHaveCount(0);
  });

  test('shows a user created meanwhile after a reload or a navigation back', async ({
    page,
  }, testInfo) => {
    await openUsersPage(page);

    const first = await createAgent(page.request, testInfo);
    await page.reload();
    await expect(userRow(page, first.email)).toBeVisible();
    await expect(badge(page, first.email, 'Active')).toHaveCount(1);

    // Client-side navigation: the cached list must be refetched.
    const nav = page.getByRole('navigation', { name: 'Main' });
    await nav.getByRole('link', { name: 'Home' }).click();
    await expect(
      page.getByRole('heading', { name: `Welcome, ${ADMIN_USER.name}` }),
    ).toBeVisible();
    const second = await createAgent(page.request, testInfo);
    await nav.getByRole('link', { name: 'Users' }).click();

    await expect(page).toHaveURL(/\/users$/);
    await expect(userRow(page, second.email)).toBeVisible();
    await expect(userRow(page, first.email)).toBeVisible();
  });
});

test.describe('when the user list cannot be loaded', () => {
  const alertOf = (page: Page) =>
    page.getByRole('alert').filter({ hasText: 'Could not load users.' });

  /** Answers every GET /api/users with `handler`; returns the request count. */
  async function mockUsersApi(
    page: Page,
    handler: (route: Route) => Promise<void>,
  ): Promise<{ count: number }> {
    const requests = { count: 0 };
    await page.route('**/api/users', async (route) => {
      requests.count += 1;
      await handler(route);
    });
    return requests;
  }

  test.beforeEach(async ({ page }) => {
    await signInViaApi(page.request, ADMIN_USER);
  });

  test('a server error is retried twice, then "Try again" loads the table once it works', async ({
    page,
  }) => {
    const requests = await mockUsersApi(page, (route) =>
      route.fulfill({ status: 500, json: { message: 'Internal error' } }),
    );

    await page.goto('/users');

    // Loading while the query retries.
    await expect(page.getByLabel('Loading users')).toBeVisible();
    // A 5xx is retried twice with TanStack's backoff (1 s + 2 s; see
    // apps/web/src/lib/query-client.ts), so the alert takes ~3 s: more than
    // the default 5 s leaves room for on a slow CI runner.
    await expect(alertOf(page)).toBeVisible({ timeout: 10_000 });
    expect(requests.count).toBe(3);
    await expect(usersTable(page)).toHaveCount(0);

    await page.unroute('**/api/users');
    await alertOf(page).getByRole('button', { name: 'Try again' }).click();

    await expect(usersTable(page)).toBeVisible();
    await expect(userRow(page, ADMIN_USER.email)).toBeVisible();
    await expect(alertOf(page)).toHaveCount(0);
  });

  test('a 4xx shows the error after one request, without retries', async ({
    page,
  }) => {
    const requests = await mockUsersApi(page, (route) =>
      route.fulfill({ status: 403, json: { message: 'Forbidden' } }),
    );

    await page.goto('/users');

    await expect(alertOf(page)).toBeVisible();
    expect(requests.count).toBe(1);
    await expect(usersTable(page)).toHaveCount(0);
  });

  test('a response that does not match the schema shows the error, without retries', async ({
    page,
  }) => {
    const requests = await mockUsersApi(page, (route) =>
      route.fulfill({
        json: {
          users: [
            {
              id: 'user-1',
              name: 'Not Valid',
              email: 'not-valid@example.com',
              role: 'superuser',
              status: UserStatus.Active,
              image: null,
              createdAt: new Date().toISOString(),
            },
          ],
        },
      }),
    );

    await page.goto('/users');

    await expect(alertOf(page)).toBeVisible();
    expect(requests.count).toBe(1);
    await expect(page.getByText('not-valid@example.com')).toHaveCount(0);
    await expect(usersTable(page)).toHaveCount(0);
  });

  test('an empty list shows "No users yet."', async ({ page }) => {
    await page.route('**/api/users', (route) =>
      route.fulfill({ json: { users: [] } }),
    );

    await page.goto('/users');

    await expect(page.getByText('No users yet.')).toBeVisible();
    await expect(usersTable(page)).toHaveCount(0);
  });
});

test.describe('on a phone-sized screen', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('hides the Role and Added columns, shows the role in the User cell, and fits the width', async ({
    page,
  }, testInfo) => {
    await signInViaApi(page.request, ADMIN_USER);
    // A long email, to check that it truncates instead of widening the table.
    const agent = await createAgent(page.request, testInfo);
    await openUsersPage(page);

    const table = usersTable(page);
    await expect(
      table.getByRole('columnheader', { name: 'User' }),
    ).toBeVisible();
    await expect(
      table.getByRole('columnheader', { name: 'Status' }),
    ).toBeVisible();
    await expect(table.getByRole('columnheader', { name: 'Role' })).toHaveCount(
      0,
    );
    await expect(
      table.getByRole('columnheader', { name: 'Added' }),
    ).toHaveCount(0);

    for (const { email, roleLabel } of [
      ...seededUsers,
      { email: agent.email, roleLabel: 'Agent' },
    ]) {
      // Only the User and Status cells are shown...
      await expect(userRow(page, email).getByRole('cell')).toHaveCount(2);
      // ...with one role badge (in the User cell) and the status badge.
      await expect(badge(page, email, roleLabel)).toHaveCount(1);
      await expect(badge(page, email, 'Active')).toHaveCount(1);
    }

    const widths = await table.evaluate((element) => ({
      table: element.scrollWidth,
      container: element.parentElement?.clientWidth ?? 0,
      containerScroll: element.parentElement?.scrollWidth ?? 0,
      page: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
    }));
    expect(widths.table).toBeLessThanOrEqual(widths.container);
    expect(widths.containerScroll).toBeLessThanOrEqual(widths.container);
    expect(widths.page).toBeLessThanOrEqual(widths.viewport);
  });
});

test.describe('on a desktop screen', () => {
  test('shows the Role and Added columns, with one role badge per row', async ({
    page,
  }) => {
    await signInViaApi(page.request, ADMIN_USER);
    await openUsersPage(page);

    const table = usersTable(page);
    for (const name of ['User', 'Role', 'Status', 'Added']) {
      await expect(table.getByRole('columnheader', { name })).toBeVisible();
    }
    for (const { email, roleLabel } of seededUsers) {
      await expect(userRow(page, email).getByRole('cell')).toHaveCount(4);
      await expect(badge(page, email, roleLabel)).toHaveCount(1);
    }
  });
});

test.describe('GET /api/users', () => {
  test('gives the admin every user, with only the list fields, sorted by name', async ({
    request,
  }, testInfo) => {
    await signInViaApi(request, ADMIN_USER);
    const banned = await createAgent(request, testInfo);
    const active = await createAgent(request, testInfo);
    await banUser(request, banned.id);

    // Checks the status, the shape and that no other fields (e.g. the ban
    // reason or expiry) leak.
    const users = await fetchUserList(request);

    for (const { name, email, role } of seededUsers) {
      expect(users).toContainEqual(
        expect.objectContaining({
          name,
          email,
          role,
          status: UserStatus.Active,
        }),
      );
    }
    expect(users).toContainEqual(
      expect.objectContaining({
        id: banned.id,
        email: banned.email,
        role: UserRole.Agent,
        status: UserStatus.Deactivated,
      }),
    );
    expect(users).toContainEqual(
      expect.objectContaining({
        id: active.id,
        email: active.email,
        status: UserStatus.Active,
      }),
    );

    const sorted = [...users].sort(
      (a, b) => compare(a.name, b.name) || compare(a.email, b.email),
    );
    expect(users.map((user) => user.email)).toEqual(
      sorted.map((user) => user.email),
    );
  });

  test('refuses an agent with 403', async ({ request }) => {
    await signInViaApi(request, AGENT);

    const response = await request.get('/api/users');

    expect(response.status()).toBe(403);
  });

  test('refuses a request without a session with 401', async ({ request }) => {
    const response = await request.get('/api/users');

    expect(response.status()).toBe(401);
  });
});
