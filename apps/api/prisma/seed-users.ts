import { randomUUID } from 'node:crypto';
import { createAuth, type AuthEnv } from '../src/auth/auth.js';
import {
  Prisma,
  type PrismaClient,
  type UserRole,
} from '../src/generated/prisma/client.js';

/** Dev/test agents. All share SEED_USER_PASSWORD (see .env.example). */
export const SEED_USERS = [
  { name: 'Maya Thompson', email: 'maya.thompson@example.com' },
  { name: 'Daniel Okafor', email: 'daniel.okafor@example.com' },
  { name: 'Sofia Ramirez', email: 'sofia.ramirez@example.com' },
  { name: 'Liam Chen', email: 'liam.chen@example.com' },
  { name: 'Priya Nair', email: 'priya.nair@example.com' },
] as const;

export const ADMIN_NAME = 'Helpdesk Admin';

export interface SeedResult {
  created: string[];
  existing: string[];
}

export type AdminSeedResult = 'created' | 'promoted' | 'exists';

interface NewUser {
  name: string;
  email: string;
  role: UserRole;
}

/**
 * Creates the user and its credential account in one insert, so a user is
 * never left without a password. Ids and the password hash are produced the
 * same way better-auth's own sign-up does. Returns false when the email is
 * already taken (unique constraint), e.g. because a concurrent run won.
 */
async function createCredentialUser(
  prisma: PrismaClient,
  env: AuthEnv,
  user: NewUser,
  passwordHash: string,
): Promise<boolean> {
  const ctx = await createAuth(prisma, env).$context;
  const newId = (model: 'user' | 'account') =>
    ctx.generateId({ model }) || randomUUID();
  const userId = newId('user');
  try {
    await prisma.user.create({
      data: {
        id: userId,
        ...user,
        emailVerified: true,
        accounts: {
          create: {
            id: newId('account'),
            accountId: userId,
            providerId: 'credential',
            password: passwordHash,
          },
        },
      },
    });
    return true;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return false;
    }
    throw error;
  }
}

async function hashPassword(prisma: PrismaClient, env: AuthEnv, pw: string) {
  return (await createAuth(prisma, env).$context).password.hash(pw);
}

/**
 * Guarantees an admin account with this email: creates it if missing, or
 * gives an existing user the admin role. Never resets the password.
 */
export async function ensureAdmin(
  prisma: PrismaClient,
  env: AuthEnv,
  { email, password }: { email: string; password: string },
): Promise<AdminSeedResult> {
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { role: true },
  });
  if (!existing) {
    const created = await createCredentialUser(
      prisma,
      env,
      { name: ADMIN_NAME, email, role: 'admin' },
      await hashPassword(prisma, env, password),
    );
    if (created) return 'created';
  }
  // Exists (or a concurrent run just created it): make sure it is an admin.
  const { count } = await prisma.user.updateMany({
    where: { email, role: { not: 'admin' } },
    data: { role: 'admin' },
  });
  return count > 0 ? 'promoted' : 'exists';
}

/**
 * Creates any SEED_USERS (as agents) that don't exist yet; existing users are
 * left untouched (their password and role are not changed). Safe to run
 * repeatedly and concurrently:
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

  const hash = await hashPassword(prisma, env, password);
  for (const { name, email } of missing) {
    const ok = await createCredentialUser(
      prisma,
      env,
      { name, email, role: 'agent' },
      hash,
    );
    (ok ? created : existing).push(email);
  }
  return { created, existing };
}
