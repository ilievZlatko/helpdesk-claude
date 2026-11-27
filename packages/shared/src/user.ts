import { z } from 'zod';

export const userRoleSchema = z.enum(['admin', 'agent']);

export type UserRole = z.infer<typeof userRoleSchema>;

/** Response of `GET /api/users/me`. */
export const currentUserSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  email: z.email(),
  role: userRoleSchema,
  image: z.string().nullable(),
});

export type CurrentUser = z.infer<typeof currentUserSchema>;
