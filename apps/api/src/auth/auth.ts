import { UserRole } from '@helpdesk/shared';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { admin } from 'better-auth/plugins/admin';
import { adminAc, userAc } from 'better-auth/plugins/admin/access';
import type { Env } from '../config/env.js';
import type { PrismaClient } from '../generated/prisma/client.js';

export type AuthEnv = Pick<
  Env,
  | 'NODE_ENV'
  | 'BETTER_AUTH_SECRET'
  | 'BETTER_AUTH_URL'
  | 'WEB_ORIGIN'
  | 'CLIENT_IP_HEADER'
  | 'TRUSTED_PROXIES'
>;

/**
 * Builds the better-auth instance. Sessions are stored in Postgres (the
 * `session` table) and checked on every request: there is no secondary
 * storage and no cookie cache.
 *
 * Rate limiting (incl. 3 sign-in attempts per 10 s per client IP) is on
 * everywhere except automated tests, stored in Postgres (`rate_limit`) so it
 * holds across API instances and restarts. The client IP comes from
 * CLIENT_IP_HEADER or, behind TRUSTED_PROXIES, from X-Forwarded-For.
 *
 * Used by AuthModule (app.module.ts) and by the seed script.
 */
export function createAuth(prisma: PrismaClient, env: AuthEnv) {
  return betterAuth({
    database: prismaAdapter(prisma, { provider: 'postgresql' }),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    basePath: '/api/auth',
    trustedOrigins: [env.WEB_ORIGIN],
    emailAndPassword: {
      enabled: true,
      // Internal tool: no self-service sign-up. Users come from the seed
      // script; the admin creates the rest.
      disableSignUp: true,
    },
    rateLimit: {
      // Explicit: better-auth only enables it when process.env.NODE_ENV is
      // "production", so a missing NODE_ENV would silently turn it off. Off
      // in tests, which sign in many times from one address.
      enabled: env.NODE_ENV !== 'test',
      storage: 'database',
    },
    advanced: {
      ipAddress: {
        // Default: X-Forwarded-For (a single value is trusted as the client).
        ipAddressHeaders: env.CLIENT_IP_HEADER
          ? [env.CLIENT_IP_HEADER]
          : undefined,
        trustedProxies: env.TRUSTED_PROXIES,
      },
    },
    plugins: [
      // Roles (user.role: admin | agent) plus admin-only endpoints under
      // /api/auth/admin/* (create/list users, ban, revoke sessions, set role).
      admin({
        defaultRole: UserRole.Agent,
        adminRoles: [UserRole.Admin],
        roles: { [UserRole.Admin]: adminAc, [UserRole.Agent]: userAc },
      }),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
