// Gets the e2e database ready before the API starts (run by the API's
// webServer command in playwright.config.ts, with its environment):
// 1. creates the database if it does not exist,
// 2. applies the Prisma migrations,
// 3. empties every table,
// 4. seeds the admin and the dev agents.
//
// Run by Node directly (type stripping), so: no imports of local .ts files,
// and only erasable TypeScript syntax.
import { execFileSync } from 'node:child_process';
import pg from 'pg';

const databaseUrl = process.env['DATABASE_URL'];
if (!databaseUrl) throw new Error('DATABASE_URL is not set.');

const url = new URL(databaseUrl);
const database = decodeURIComponent(url.pathname.slice(1));
// This script deletes all data: refuse anything that isn't a test database.
if (!database.endsWith('_test')) {
  throw new Error(
    `Refusing to reset "${database}": the e2e database name must end in "_test".`,
  );
}

async function withClient<T>(
  connectionString: string,
  run: (client: pg.Client) => Promise<T>,
): Promise<T> {
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    return await run(client);
  } finally {
    await client.end();
  }
}

// 1. Create the database (connecting to the server's maintenance database).
const maintenanceUrl = new URL(url);
maintenanceUrl.pathname = '/postgres';
await withClient(maintenanceUrl.toString(), async (client) => {
  const { rowCount } = await client.query(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [database],
  );
  if (!rowCount) {
    await client.query(`CREATE DATABASE ${client.escapeIdentifier(database)}`);
    console.log(`[e2e] created database ${database}`);
  }
});

const api = (...args: string[]) =>
  execFileSync('pnpm', ['--filter', '@helpdesk/api', ...args], {
    stdio: 'inherit',
    env: process.env,
  });

// 2. Migrate.
api('exec', 'prisma', 'migrate', 'deploy');

// 3. Empty every table but Prisma's migration history.
await withClient(databaseUrl, async (client) => {
  const { rows } = await client.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables
     WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`,
  );
  if (rows.length) {
    const tables = rows
      .map(({ tablename }) => `public.${client.escapeIdentifier(tablename)}`)
      .join(', ');
    await client.query(`TRUNCATE ${tables} RESTART IDENTITY CASCADE`);
  }
});

// 4. Seed.
api('db:seed');
