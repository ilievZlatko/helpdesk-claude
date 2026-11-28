// Settings for the Playwright run. The servers started by playwright.config.ts
// use their own ports and their own database, so a run never touches the dev
// servers (:3000, :5173) or the dev database, and can run next to `pnpm dev`.
import { randomBytes } from 'node:crypto';

export const API_PORT = Number(process.env['E2E_API_PORT'] ?? 3001);
export const WEB_PORT = Number(process.env['E2E_WEB_PORT'] ?? 5174);

export const API_URL = `http://localhost:${API_PORT}`;
export const WEB_URL = `http://localhost:${WEB_PORT}`;

/**
 * The test database. It is wiped and re-seeded at the start of every run
 * (scripts/prepare-db.ts), so its name must end in `_test`. Defaults to a
 * `helpdesk_test` database in the docker-compose Postgres.
 */
export const DATABASE_URL =
  process.env['E2E_DATABASE_URL'] ??
  'postgresql://helpdesk:helpdesk@localhost:5433/helpdesk_test';

// The config is loaded by the runner and again by every worker; workers
// inherit the runner's environment, so they all see the same values.
// A fresh secret per run: nothing outlives the run, so nothing to keep.
const BETTER_AUTH_SECRET = (process.env['E2E_BETTER_AUTH_SECRET'] ??=
  randomBytes(32).toString('base64'));

/** Accounts created by the seed (dev/test-only defaults from .env.example). */
export const ADMIN = {
  email: process.env['E2E_ADMIN_EMAIL'] ?? 'admin@example.com',
  password: process.env['E2E_ADMIN_PASSWORD'] ?? 'password123',
};
export const SEED_USER_PASSWORD =
  process.env['E2E_SEED_USER_PASSWORD'] ?? 'helpdesk-dev-password';

/** Environment for the API server and the seed script. */
export const apiEnv: Record<string, string> = {
  NODE_ENV: 'test',
  PORT: String(API_PORT),
  DATABASE_URL,
  BETTER_AUTH_SECRET,
  // As in development: the browser talks to the web server, which proxies
  // /api to the API.
  BETTER_AUTH_URL: API_URL,
  WEB_ORIGIN: WEB_URL,
  ADMIN_EMAIL: ADMIN.email,
  ADMIN_PASSWORD: ADMIN.password,
  SEED_USER_PASSWORD,
};
