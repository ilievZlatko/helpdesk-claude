import { defineConfig, devices } from '@playwright/test';
import { API_URL, WEB_PORT, WEB_URL, apiEnv } from './env.ts';

const isCI = !!process.env['CI'];

export default defineConfig({
  testDir: './tests',
  // Tests share one database, so run them one at a time until they isolate
  // their data.
  fullyParallel: false,
  workers: 1,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : 'html',
  use: {
    baseURL: WEB_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Production builds of both apps (`pnpm e2e` builds them first through
  // Turborepo). Never reuse a running server: it might not be using the
  // freshly reset test database.
  webServer: [
    {
      name: 'api',
      // Reset and seed the test database, then start the API on it.
      command: 'node scripts/prepare-db.ts && node ../api/dist/main.js',
      // Run from this folder so Nest's ConfigModule doesn't load
      // apps/api/.env (the dev settings).
      cwd: import.meta.dirname,
      env: apiEnv,
      url: `${API_URL}/api/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      gracefulShutdown: { signal: 'SIGTERM', timeout: 5_000 },
    },
    {
      name: 'web',
      command: `pnpm --filter @helpdesk/web exec vite preview --port ${WEB_PORT} --strictPort`,
      env: { API_PROXY_TARGET: API_URL },
      url: WEB_URL,
      reuseExistingServer: false,
    },
  ],
});
