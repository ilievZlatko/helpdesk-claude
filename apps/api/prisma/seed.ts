// `pnpm db:seed`. Idempotent.
// - Always: guarantees the admin from ADMIN_EMAIL / ADMIN_PASSWORD.
// - Only when SEED_USER_PASSWORD is set and NODE_ENV is development or test:
//   creates the dev agents. (validateEnv also rejects SEED_USER_PASSWORD in
//   production.)
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { validateEnv } from '../src/config/env.js';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { ensureAdmin, seedUsers } from './seed-users.js';

const env = validateEnv(process.env);
if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
  throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD to run the seed.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
});
try {
  const admin = await ensureAdmin(prisma, env, {
    email: env.ADMIN_EMAIL,
    password: env.ADMIN_PASSWORD,
  });
  console.log(`admin    ${env.ADMIN_EMAIL} (${admin})`);

  if (env.SEED_USER_PASSWORD && env.NODE_ENV !== 'production') {
    const { created, existing } = await seedUsers(
      prisma,
      env,
      env.SEED_USER_PASSWORD,
    );
    for (const email of created) console.log(`created  ${email}`);
    for (const email of existing) console.log(`exists   ${email}`);
  } else {
    console.log(
      'SEED_USER_PASSWORD not set (or production): skipping dev users',
    );
  }
} finally {
  await prisma.$disconnect();
}
