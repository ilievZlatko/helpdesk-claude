import { DEV_DEFAULT_PASSWORDS, envSchema } from './env.js';

/** A valid local-development environment. */
const dev = {
  DATABASE_URL: 'postgresql://helpdesk:helpdesk@localhost:5433/helpdesk',
  BETTER_AUTH_SECRET: 'x'.repeat(32),
  BETTER_AUTH_URL: 'http://localhost:3000',
  ADMIN_EMAIL: 'admin@example.com',
  ADMIN_PASSWORD: 'password123',
  SEED_USER_PASSWORD: 'helpdesk-dev-password',
};

/** A valid production environment. */
const production = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://helpdesk:secret@db.internal:5432/helpdesk',
  BETTER_AUTH_SECRET: 'x'.repeat(32),
  BETTER_AUTH_URL: 'https://helpdesk.acme.edu',
  WEB_ORIGIN: 'https://helpdesk.acme.edu',
  CLIENT_IP_HEADER: 'fly-client-ip',
  ADMIN_EMAIL: 'it-admin@acme.edu',
  ADMIN_PASSWORD: 'a-long-and-unique-passphrase',
};

/** The paths of the issues a parse reports, e.g. ['ADMIN_PASSWORD']. */
function issuePaths(config: Record<string, unknown>) {
  const result = envSchema.safeParse(config);
  return result.success ? [] : result.error.issues.map((i) => i.path.join('.'));
}

describe('envSchema', () => {
  it('accepts the published dev defaults in development', () => {
    expect(envSchema.parse(dev).NODE_ENV).toBe('development');
  });

  it('accepts a correctly configured production environment', () => {
    expect(issuePaths(production)).toEqual([]);
  });

  describe('in production', () => {
    it('rejects SEED_USER_PASSWORD (dev accounts with a shared password)', () => {
      expect(
        issuePaths({ ...production, SEED_USER_PASSWORD: 'any-password' }),
      ).toEqual(['SEED_USER_PASSWORD']);
    });

    it('rejects the example admin email', () => {
      expect(
        issuePaths({ ...production, ADMIN_EMAIL: 'Admin@Example.com' }),
      ).toEqual(['ADMIN_EMAIL']);
    });

    it.each(DEV_DEFAULT_PASSWORDS)(
      'rejects the published dev password %s for the admin',
      (password) => {
        expect(issuePaths({ ...production, ADMIN_PASSWORD: password })).toEqual(
          ['ADMIN_PASSWORD'],
        );
      },
    );

    it('rejects a short admin password', () => {
      expect(
        issuePaths({ ...production, ADMIN_PASSWORD: 'Short-pass-1' }),
      ).toEqual(['ADMIN_PASSWORD']);
    });

    it('allows running without the seed variables', () => {
      const {
        ADMIN_EMAIL: _e,
        ADMIN_PASSWORD: _p,
        ...withoutSeed
      } = production;
      expect(issuePaths(withoutSeed)).toEqual([]);
    });

    it('requires CLIENT_IP_HEADER or TRUSTED_PROXIES', () => {
      const { CLIENT_IP_HEADER: _h, ...withoutIp } = production;
      expect(issuePaths(withoutIp)).toEqual(['CLIENT_IP_HEADER']);
      expect(
        issuePaths({ ...withoutIp, TRUSTED_PROXIES: '10.0.0.0/8' }),
      ).toEqual([]);
    });
  });

  it('requires NODE_ENV=production when BETTER_AUTH_URL is https', () => {
    const { NODE_ENV: _n, ...unset } = production;
    expect(issuePaths(unset)).toContain('NODE_ENV');
    expect(issuePaths({ ...production, NODE_ENV: 'development' })).toContain(
      'NODE_ENV',
    );
  });

  describe('TRUSTED_PROXIES', () => {
    it('parses a comma-separated list of IPs and CIDR ranges', () => {
      const env = envSchema.parse({
        ...dev,
        TRUSTED_PROXIES: ' 10.0.0.0/8, 192.168.1.5 ,fd00::/8 ',
      });
      expect(env.TRUSTED_PROXIES).toEqual([
        '10.0.0.0/8',
        '192.168.1.5',
        'fd00::/8',
      ]);
    });

    it('rejects entries that are not IPs or CIDR ranges', () => {
      expect(
        issuePaths({ ...dev, TRUSTED_PROXIES: '10.0.0.0/8,proxy.internal' }),
      ).toEqual(['TRUSTED_PROXIES.1']);
    });
  });

  it('normalizes CLIENT_IP_HEADER to lower case', () => {
    expect(
      envSchema.parse({ ...dev, CLIENT_IP_HEADER: ' CF-Connecting-IP ' })
        .CLIENT_IP_HEADER,
    ).toBe('cf-connecting-ip');
  });
});
