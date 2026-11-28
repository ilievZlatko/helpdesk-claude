// Sign-in rate limiting against the real database (rateLimit.storage =
// "database"). Rate limiting is on in production only and the app under test
// (AppModule) runs with NODE_ENV=test, so this file builds its own auth
// instance with NODE_ENV=production and calls better-auth's handler directly.
import 'dotenv/config';
import { randomInt } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { inject } from 'vitest';
import { createAuth, type AuthEnv } from '../src/auth/auth.js';
import { validateEnv } from '../src/config/env.js';
import { PrismaClient } from '../src/generated/prisma/client.js';

const env = validateEnv(process.env);
const seedUser = inject('seedUser');
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
});

// Client IPs from a documentation range (RFC 5737), unique to this run so
// rows from other runs can't interfere; deleted in afterAll.
const subnet = `198.51.${randomInt(0, 256)}`;
const usedIps: string[] = [];
function clientIp() {
  const ip = `${subnet}.${usedIps.length + 1}`;
  usedIps.push(ip);
  return ip;
}

function authWith(overrides: Partial<AuthEnv> = {}) {
  return createAuth(prisma, {
    ...env,
    NODE_ENV: 'production', // rate limiting on
    CLIENT_IP_HEADER: undefined,
    TRUSTED_PROXIES: undefined,
    ...overrides,
  });
}

/** One sign-in attempt with a wrong password; resolves to the status code. */
async function attempt(
  auth: ReturnType<typeof authWith>,
  headers: Record<string, string>,
) {
  const response = await auth.handler(
    new Request(`${env.BETTER_AUTH_URL}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: env.WEB_ORIGIN,
        ...headers,
      },
      body: JSON.stringify({ email: seedUser.email, password: 'wrong-pass' }),
    }),
  );
  return response.status;
}

afterAll(async () => {
  await prisma.rateLimit.deleteMany({
    where: { OR: usedIps.map((ip) => ({ key: { startsWith: `${ip}|` } })) },
  });
  await prisma.$disconnect();
});

describe('Sign-in rate limiting (e2e)', () => {
  it('blocks the 4th sign-in attempt within 10 seconds from one client', async () => {
    const auth = authWith();
    const ip = clientIp();

    const statuses = [];
    for (let i = 0; i < 4; i++) {
      statuses.push(await attempt(auth, { 'x-forwarded-for': ip }));
    }

    expect(statuses).toEqual([401, 401, 401, 429]);
    expect(
      await prisma.rateLimit.count({
        where: { key: { startsWith: `${ip}|` } },
      }),
    ).toBe(1);
  });

  it('cannot be bypassed with a forged X-Forwarded-For when CLIENT_IP_HEADER is set', async () => {
    const auth = authWith({ CLIENT_IP_HEADER: 'x-client-ip' });
    const realIp = clientIp();

    const statuses = [];
    for (let i = 0; i < 4; i++) {
      statuses.push(
        await attempt(auth, {
          'x-client-ip': realIp, // set by the platform, not the client
          'x-forwarded-for': clientIp(), // forged: a new value each time
        }),
      );
    }

    expect(statuses).toEqual([401, 401, 401, 429]);
  });

  it('counts each client separately', async () => {
    const auth = authWith();
    const first = clientIp();
    for (let i = 0; i < 3; i++) {
      await attempt(auth, { 'x-forwarded-for': first });
    }

    expect(await attempt(auth, { 'x-forwarded-for': clientIp() })).toBe(401);
  });
});
