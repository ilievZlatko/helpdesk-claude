import { randomUUID } from 'node:crypto';
import { createAuth, type AuthEnv } from '../src/auth/auth.js';
import { Prisma, type PrismaClient } from '../src/generated/prisma/client.js';

/** Dev/test users. All share SEED_USER_PASSWORD (see .env.example). */
export const SEED_USERS = [
  { name: 'Maya Thompson', email: 'maya.thompson@example.com' },
  { name: 'Daniel Okafor', email: 'daniel.okafor@example.com' },
  { name: 'Sofia Ramirez', email: 'sofia.ramirez@example.com' },
  { name: 'Liam Chen', email: 'liam.chen@example.com' },
  { name: 'Priya Nair', email: 'priya.nair@example.com' },
] as const;

export interface SeedResult {
  created: string[];
  existing: string[];
}

/**
 * Creates any SEED_USERS that don't exist yet; existing users are left
 * untouched (their password is not reset). Safe to run repeatedly and
 * concurrently:
 * - users already in the database are skipped up front, so a fully seeded
 *   database costs one query and no password hashing;
 * - the unique constraint on `user.email` is the final guard: if another run
 *   inserts the same user first, the duplicate insert fails and is counted as
 *   existing.
 */
export async function seedUsers(
  prisma: PrismaClient,
  env: AuthEnv,
  password: string,
): Promise<SeedResult> {
  const found = await prisma.user.findMany({
    where: { email: { in: SEED_USERS.map((u) => u.email) } },
    select: { email: true },
  });
  const existing = found.map((u) => u.email);
  const missing = SEED_USERS.filter((u) => !existing.includes(u.email));
  const created: string[] = [];
  if (missing.length === 0) return { created, existing };

  // Hash and generate ids the same way better-auth's sign-up does.
  const ctx = await createAuth(prisma, env).$context;
  const newId = (model: 'user' | 'account') =>
    ctx.generateId({ model }) || randomUUID();
  const hash = await ctx.password.hash(password);

  for (const { name, email } of missing) {
    const userId = newId('user');
    try {
      // One insert for the user and its credential account, so a user is
      // never left without a password.
      await prisma.user.create({
        data: {
          id: userId,
          name,
          email,
          emailVerified: true,
          accounts: {
            create: {
              id: newId('account'),
              accountId: userId,
              providerId: 'credential',
              password: hash,
            },
          },
        },
      });
      created.push(email);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        existing.push(email);
        continue;
      }
      throw error;
    }
  }
  return { created, existing };
}
