import { zodResolver } from '@hookform/resolvers/zod';
import { signInSchema, type SignInInput } from '@helpdesk/shared';
import { WarningCircleIcon } from '@phosphor-icons/react';
import { useForm } from 'react-hook-form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { authClient } from './auth-client';
import { cn } from '@/lib/utils';

/** Inputs that sit "in" the frosted card: a translucent off-white, blurred, softly inset. */
const glassInputClass =
  'autofill-keep-bg h-10 border-slate-400/25 bg-slate-50/40 shadow-[inset_0_1px_2px_rgb(15_23_42/0.06)] backdrop-blur-md transition-[color,background-color,border-color,box-shadow] placeholder:text-slate-500 hover:bg-slate-50/55 focus-visible:border-primary/60 focus-visible:bg-white/60 focus-visible:ring-primary/20 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 dark:focus-visible:bg-white/10';

function signInErrorMessage(error: { status: number; code?: string }): string {
  // better-auth's admin plugin rejects banned users with 403 BANNED_USER.
  if (error.code === 'BANNED_USER') {
    return 'Your account has been disabled. Contact your administrator.';
  }
  if (error.status === 401) return 'Invalid email or password.';
  if (error.status === 429)
    return 'Too many sign-in attempts. Try again later.';
  return 'Something went wrong. Please try again.';
}

type LoginFormProps = {
  /**
   * Called once the user is signed in and the session is loaded, so protected
   * routes already see it. The caller decides where to go next.
   */
  onSuccess: () => void;
  className?: string;
};

/**
 * Email/password sign-in in a frosted-glass card: validates with the shared
 * `signInSchema`, signs in through better-auth, and shows field and server
 * errors.
 */
export function LoginForm({ onSuccess, className }: LoginFormProps) {
  const { refetch: refetchSession } = authClient.useSession();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: SignInInput) {
    try {
      const { error } = await authClient.signIn.email(values);
      if (error) {
        setError('root', { message: signInErrorMessage(error) });
        return;
      }
    } catch {
      setError('root', {
        message: 'Could not reach the server. Please try again.',
      });
      return;
    }
    await refetchSession();
    onSuccess();
  }

  return (
    <Card
      className={cn(
        'w-full max-w-sm border-white/70 bg-white/45 shadow-2xl shadow-indigo-950/25 ring-1 ring-white/40 ring-inset backdrop-blur-2xl backdrop-saturate-150 dark:border-white/15 dark:bg-slate-900/40 dark:ring-white/5',
        className,
      )}
    >
      <CardHeader>
        <CardTitle>
          <h1 className="text-lg">Welcome back</h1>
        </CardTitle>
        <CardDescription>
          Enter your email and password to sign in.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form noValidate onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
          <FieldGroup>
            {errors.root && (
              <Alert variant="destructive">
                <WarningCircleIcon aria-hidden />
                <AlertDescription>{errors.root.message}</AlertDescription>
              </Alert>
            )}
            <Field data-invalid={!!errors.email}>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="name@company.com"
                className={glassInputClass}
                aria-invalid={!!errors.email}
                {...register('email')}
              />
              <FieldError errors={[errors.email]} />
            </Field>
            <Field data-invalid={!!errors.password}>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                className={glassInputClass}
                aria-invalid={!!errors.password}
                {...register('password')}
              />
              <FieldError errors={[errors.password]} />
            </Field>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
