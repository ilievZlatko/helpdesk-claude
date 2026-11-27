import { z } from 'zod';

/**
 * Body of better-auth's `POST /api/auth/sign-in/email`, used by the web login
 * form. The password is only checked for presence: the password policy is
 * enforced when an account is created, not when signing in.
 */
export const signInSchema = z.object({
  email: z.email({ error: 'Enter a valid email address' }),
  password: z.string().min(1, { error: 'Enter your password' }),
});

export type SignInInput = z.infer<typeof signInSchema>;
