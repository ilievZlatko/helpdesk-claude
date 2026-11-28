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

/**
 * Whether a user can sign in. Stored as better-auth's admin-plugin ban
 * (`user.banned`, optionally until `banExpires`): a deactivated user is a
 * banned one.
 */
export const UserStatus = {
  Active: 'active',
  Deactivated: 'deactivated',
} as const;

export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const userStatusSchema = z.enum(UserStatus);

/** One user in the admin's user list (`GET /api/users`). */
export const userListItemSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  email: z.email(),
  role: userRoleSchema,
  status: userStatusSchema,
  image: z.string().nullable(),
  /** ISO 8601 timestamp. */
  createdAt: z.iso.datetime(),
});

export type UserListItem = z.infer<typeof userListItemSchema>;

/** Response of `GET /api/users` (admin only), sorted by name. */
export const userListResponseSchema = z.object({
  users: z.array(userListItemSchema),
});

export type UserListResponse = z.infer<typeof userListResponseSchema>;
