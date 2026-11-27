// Runs once before all e2e test files: makes sure the admin and the dev
// agents exist and hands their credentials to the tests via inject().
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import type { TestProject } from 'vitest/node';
import { validateEnv } from '../src/config/env.js';
import { PrismaClient } from '../src/generated/prisma/client.js';
import {
  ADMIN_NAME,
  SEED_USERS,
  ensureAdmin,
  seedUsers,
} from '../prisma/seed-users.js';

export interface SeedUserCredentials {
  name: string;
  email: string;
  password: string;
}

declare module 'vitest' {
  export interface ProvidedContext {
    /** A seeded agent. */
    seedUser: SeedUserCredentials;
    /** The seeded admin. */
    adminUser: SeedUserCredentials;
  }
}

export default async function setup(project: TestProject) {
  const env = validateEnv(process.env);
  const { ADMIN_EMAIL, ADMIN_PASSWORD, SEED_USER_PASSWORD } = env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !SEED_USER_PASSWORD) {
    throw new Error(
      'ADMIN_EMAIL, ADMIN_PASSWORD and SEED_USER_PASSWORD must be set for the e2e tests.',
    );
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
  });
  try {
    await ensureAdmin(prisma, env, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    await seedUsers(prisma, env, SEED_USER_PASSWORD);
  } finally {
    await prisma.$disconnect();
  }

  project.provide('seedUser', {
    ...SEED_USERS[0],
    password: SEED_USER_PASSWORD,
  });
  project.provide('adminUser', {
    name: ADMIN_NAME,
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
}
