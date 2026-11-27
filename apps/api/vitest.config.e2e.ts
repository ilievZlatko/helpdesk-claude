import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Seeds the dev users once per run (idempotent).
    globalSetup: ['./test/global-setup.ts'],
  },
});
