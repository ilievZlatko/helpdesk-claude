import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { admin } from 'better-auth/plugins/admin';
import { adminAc, userAc } from 'better-auth/plugins/admin/access';
import type { Env } from '../config/env.js';
import type { PrismaClient } from '../generated/prisma/client.js';

export type AuthEnv = Pick<
  Env,
  'BETTER_AUTH_SECRET' | 'BETTER_AUTH_URL' | 'WEB_ORIGIN'
>;

/**
 * Builds the better-auth instance. Sessions are stored in Postgres (the
 * `session` table) and checked on every request: there is no secondary
 * storage and no cookie cache.
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
    plugins: [
      // Roles (user.role: admin | agent) plus admin-only endpoints under
      // /api/auth/admin/* (create/list users, ban, revoke sessions, set role).
      admin({
        defaultRole: 'agent',
        adminRoles: ['admin'],
        roles: { admin: adminAc, agent: userAc },
      }),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
