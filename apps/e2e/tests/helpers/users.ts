// Helpers for the admin's user list (/users and GET /api/users).
import { userListResponseSchema, type UserListItem } from '@helpdesk/shared';
import { expect, type APIRequestContext, type Page } from '@playwright/test';

/** The only fields a list item may have (no ban details, no password). */
export const USER_LIST_FIELDS = [
  'createdAt',
  'email',
  'id',
  'image',
  'name',
  'role',
  'status',
];

/**
 * Parses a `GET /api/users` body with the shared schema, and checks that no
 * item has extra fields (Zod drops unknown keys, so `parse` alone wouldn't
 * notice, e.g., a leaked ban reason).
 */
export function parseUserList(body: unknown): UserListItem[] {
  const { users } = userListResponseSchema.parse(body);
  expect(Object.keys(body as object)).toEqual(['users']);
  for (const user of (body as { users: object[] }).users) {
    expect(Object.keys(user).sort(), JSON.stringify(user)).toEqual(
      USER_LIST_FIELDS,
    );
  }
  return users;
}

/** `GET /api/users` as the signed-in admin, parsed with `parseUserList`. */
export async function fetchUserList(
  request: APIRequestContext,
): Promise<UserListItem[]> {
  const response = await request.get('/api/users');
  expect(response.status(), 'GET /api/users').toBe(200);
  return parseUserList(await response.json());
}

/** The users table on /users. */
export function usersTable(page: Page) {
  return page.getByRole('table');
}

/** The table's body rows (one per user; the header row has no cells). */
export function userRows(page: Page) {
  return usersTable(page)
    .getByRole('row')
    .filter({ has: page.getByRole('cell') });
}

/** The row of the user with this email (emails are unique). */
export function userRow(page: Page, email: string) {
  return userRows(page).filter({ hasText: email });
}

/** The emails of the visible rows, top to bottom. */
export async function visibleEmails(page: Page): Promise<string[]> {
  const texts = await userRows(page).allInnerTexts();
  return texts.map((text) => {
    const email = text.split(/\s+/).find((word) => word.includes('@'));
    expect(email, `an email in row "${text}"`).toBeDefined();
    return email as string;
  });
}

/** Opens /users and waits for the table (the page must be signed in as an admin). */
export async function openUsersPage(page: Page): Promise<void> {
  await page.goto('/users');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Users' }),
  ).toBeVisible();
  await expect(usersTable(page)).toBeVisible();
}
