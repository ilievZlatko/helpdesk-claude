import { z } from 'zod';

/**
 * Dev/test passwords published in `.env.example`, the README and CI. They must
 * never protect a production account.
 */
export const DEV_DEFAULT_PASSWORDS: readonly string[] = [
  'password123',
  'helpdesk-dev-password',
];

/** Minimum admin password length in production. */
export const PRODUCTION_ADMIN_PASSWORD_MIN = 16;

/** An IP address or CIDR range, e.g. `10.0.0.1` or `10.0.0.0/8`. */
const ipOrCidr = z.union([z.ipv4(), z.ipv6(), z.cidrv4(), z.cidrv6()], {
  error: 'Expected an IP address or CIDR range',
});

export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.url(),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    WEB_ORIGIN: z.url().default('http://localhost:5173'),
    // Where the real client IP comes from, for sign-in rate limiting. One of
    // these is required in production (see the production checks below):
    // - the header the hosting platform sets to the client IP and clients
    //   cannot forge (e.g. `fly-client-ip`, `cf-connecting-ip`);
    CLIENT_IP_HEADER: z.string().trim().toLowerCase().min(1).optional(),
    // - or the proxies in front of the API (comma-separated IPs/CIDRs), so
    //   X-Forwarded-For is read from the right, skipping them.
    TRUSTED_PROXIES: z
      .string()
      .transform((value) =>
        value
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean),
      )
      .pipe(z.array(ipOrCidr).min(1))
      .optional(),
    // Only used by the seed script (prisma/seed.ts) and the e2e setup.
    // The admin account the seed guarantees (required to seed).
    ADMIN_EMAIL: z.email().optional(),
    ADMIN_PASSWORD: z.string().min(8).optional(),
    // Dev/test agents are seeded only when this is set (never in production).
    SEED_USER_PASSWORD: z.string().min(8).optional(),
  })
  .superRefine((env, ctx) => {
    // An https URL means a real deployment: refuse to run it as development
    // (which would, among other things, use dev-only fallbacks).
    if (
      new URL(env.BETTER_AUTH_URL).protocol === 'https:' &&
      env.NODE_ENV !== 'production'
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['NODE_ENV'],
        message:
          'Must be "production" when BETTER_AUTH_URL is https (it defaults to "development" when unset)',
      });
    }

    if (env.NODE_ENV !== 'production') return;

    if (env.SEED_USER_PASSWORD) {
      ctx.addIssue({
        code: 'custom',
        path: ['SEED_USER_PASSWORD'],
        message:
          'Must not be set in production (it creates dev accounts with a shared password)',
      });
    }
    if (env.ADMIN_EMAIL?.toLowerCase().endsWith('@example.com')) {
      ctx.addIssue({
        code: 'custom',
        path: ['ADMIN_EMAIL'],
        message: 'Use a real address in production, not the example one',
      });
    }
    if (
      env.ADMIN_PASSWORD &&
      (env.ADMIN_PASSWORD.length < PRODUCTION_ADMIN_PASSWORD_MIN ||
        DEV_DEFAULT_PASSWORDS.includes(env.ADMIN_PASSWORD))
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['ADMIN_PASSWORD'],
        message: `Use a strong, non-default password in production (at least ${PRODUCTION_ADMIN_PASSWORD_MIN} characters)`,
      });
    }
    if (!env.CLIENT_IP_HEADER && !env.TRUSTED_PROXIES) {
      ctx.addIssue({
        code: 'custom',
        path: ['CLIENT_IP_HEADER'],
        message:
          'Set CLIENT_IP_HEADER or TRUSTED_PROXIES in production, so sign-in rate limiting uses the real client IP and cannot be bypassed with a forged X-Forwarded-For',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    throw new Error(
      `Invalid environment variables:\n${z.prettifyError(result.error)}`,
    );
  }
  return result.data;
}
