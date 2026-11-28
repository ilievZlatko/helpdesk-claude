// Smoke test for the e2e setup: the web app is served, it reaches the API
// through the /api proxy, and the seeded admin can sign in on the test
// database.
import { expect, test } from '@playwright/test';
import { ADMIN } from '../env.ts';

test('the API is reachable through the web server', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.ok()).toBe(true);
  expect(await response.json()).toMatchObject({ status: 'ok' });
});

test('the seeded admin signs in and sees the home page', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel('Email').fill(ADMIN.email);
  await page.getByLabel('Password').fill(ADMIN.password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole('heading', { name: 'Welcome, Helpdesk Admin' }),
  ).toBeVisible();
  await expect(page.getByText('API status: ok')).toBeVisible();
});
