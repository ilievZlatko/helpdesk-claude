// Runs once before all e2e test files: makes sure the seed users exist and
// hands their credentials to the tests via inject('seedUser').
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import type { TestProject } from 'vitest/node';
import { validateEnv } from '../src/config/env.js';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { SEED_USERS, seedUsers } from '../prisma/seed-users.js';

export interface SeedUserCredentials {
  name: string;
  email: string;
  password: string;
}

declare module 'vitest' {
  export interface ProvidedContext {
    seedUser: SeedUserCredentials;
  }
}

export default async function setup(project: TestProject) {
  const env = validateEnv(process.env);
  if (!env.SEED_USER_PASSWORD) {
    throw new Error('SEED_USER_PASSWORD must be set for the e2e tests.');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
  });
  try {
    await seedUsers(prisma, env, env.SEED_USER_PASSWORD);
  } finally {
    await prisma.$disconnect();
  }

  project.provide('seedUser', {
    ...SEED_USERS[0],
    password: env.SEED_USER_PASSWORD,
  });
}
