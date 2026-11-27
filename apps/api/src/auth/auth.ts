import type { ConfigService } from '@nestjs/config';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import type { Env } from '../config/env.js';
import type { PrismaService } from '../prisma/prisma.service.js';

/**
 * Builds the better-auth instance. Sessions are stored in Postgres (the
 * `session` table) and checked on every request: there is no secondary
 * storage and no cookie cache.
 */
export function createAuth(
  prisma: PrismaService,
  config: ConfigService<Env, true>,
) {
  return betterAuth({
    database: prismaAdapter(prisma, { provider: 'postgresql' }),
    secret: config.get('BETTER_AUTH_SECRET', { infer: true }),
    baseURL: config.get('BETTER_AUTH_URL', { infer: true }),
    basePath: '/api/auth',
    trustedOrigins: [config.get('WEB_ORIGIN', { infer: true })],
    emailAndPassword: { enabled: true },
  });
}

export type Auth = ReturnType<typeof createAuth>;
