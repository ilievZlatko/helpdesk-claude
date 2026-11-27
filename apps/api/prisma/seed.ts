// `pnpm db:seed`: creates the dev users from seed-users.ts. Idempotent.
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { validateEnv } from '../src/config/env.js';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { seedUsers } from './seed-users.js';

const env = validateEnv(process.env);
if (!env.SEED_USER_PASSWORD) {
  throw new Error('Set SEED_USER_PASSWORD in apps/api/.env to run the seed.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
});
try {
  const { created, existing } = await seedUsers(
    prisma,
    env,
    env.SEED_USER_PASSWORD,
  );
  for (const email of created) console.log(`created  ${email}`);
  for (const email of existing) console.log(`exists   ${email}`);
} finally {
  await prisma.$disconnect();
}
