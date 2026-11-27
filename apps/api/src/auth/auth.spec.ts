import type { PrismaClient } from '../generated/prisma/client.js';
import { createAuth, type AuthEnv } from './auth.js';

// createAuth only stores the client; nothing here talks to the database.
const prisma = {} as PrismaClient;

const env: AuthEnv = {
  NODE_ENV: 'development',
  BETTER_AUTH_SECRET: 'x'.repeat(32),
  BETTER_AUTH_URL: 'http://localhost:3000',
  WEB_ORIGIN: 'http://localhost:5173',
  CLIENT_IP_HEADER: undefined,
  TRUSTED_PROXIES: undefined,
};

describe('createAuth rate limiting', () => {
  it.each(['development', 'production'] as const)(
    'is on in %s, stored in the database',
    (NODE_ENV) => {
      const { rateLimit } = createAuth(prisma, { ...env, NODE_ENV }).options;
      expect(rateLimit).toMatchObject({ enabled: true, storage: 'database' });
    },
  );

  it('is off in automated tests', () => {
    const { rateLimit } = createAuth(prisma, {
      ...env,
      NODE_ENV: 'test',
    }).options;
    expect(rateLimit?.enabled).toBe(false);
  });

  it('reads the client IP from CLIENT_IP_HEADER when set', () => {
    const { advanced } = createAuth(prisma, {
      ...env,
      CLIENT_IP_HEADER: 'fly-client-ip',
    }).options;
    expect(advanced?.ipAddress?.ipAddressHeaders).toEqual(['fly-client-ip']);
  });

  it('passes TRUSTED_PROXIES through for X-Forwarded-For', () => {
    const { advanced } = createAuth(prisma, {
      ...env,
      TRUSTED_PROXIES: ['10.0.0.0/8'],
    }).options;
    expect(advanced?.ipAddress?.trustedProxies).toEqual(['10.0.0.0/8']);
    expect(advanced?.ipAddress?.ipAddressHeaders).toBeUndefined();
  });
});
