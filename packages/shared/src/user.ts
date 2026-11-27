import { z } from 'zod';

/**
 * User roles. A const object rather than a TS `enum`, so the values are plain
 * string literals that Prisma's `UserRole` and better-auth accept without
 * casts. Must match `enum UserRole` in apps/api/prisma/schema.prisma (a test
 * in apps/api checks this).
 */
export const UserRole = {
  Admin: 'admin',
  Agent: 'agent',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const userRoleSchema = z.enum(UserRole);

/** Response of `GET /api/users/me`. */
export const currentUserSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  email: z.email(),
  role: userRoleSchema,
  image: z.string().nullable(),
});

export type CurrentUser = z.infer<typeof currentUserSchema>;
