import { zodResolver } from '@hookform/resolvers/zod';
import { signInSchema, type SignInInput } from '@helpdesk/shared';
import { AlertCircle, LifeBuoy } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { useRedirectAfterLogin } from '@/lib/login-redirect';
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
import { authClient } from '@/lib/auth-client';

function signInErrorMessage(status: number): string {
  if (status === 401) return 'Invalid email or password.';
  if (status === 429) return 'Too many sign-in attempts. Try again later.';
  return 'Something went wrong. Please try again.';
}

export function LoginPage() {
  const navigate = useNavigate();
  const redirectTo = useRedirectAfterLogin();
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
        setError('root', { message: signInErrorMessage(error.status) });
        return;
      }
    } catch {
      setError('root', {
        message: 'Could not reach the server. Please try again.',
      });
      return;
    }
    // Load the new session before leaving, so the protected route sees it.
    await refetchSession();
    void navigate(redirectTo, { replace: true });
  }

  return (
    <main className="relative isolate flex min-h-svh flex-col items-center justify-center gap-8 overflow-hidden p-6">
      <LoginBackground />
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
          <LifeBuoy className="size-6" aria-hidden />
        </div>
        <div>
          <p className="text-xl font-semibold tracking-tight">Helpdesk</p>
          <p className="text-sm text-muted-foreground">
            AI-powered support, from inbox to answer
          </p>
        </div>
      </div>
      <Card className="w-full max-w-sm border-white/70 bg-white/45 shadow-2xl shadow-indigo-950/25 ring-1 ring-white/40 ring-inset backdrop-blur-2xl backdrop-saturate-150 dark:border-white/10 dark:bg-slate-900/40">
        <CardHeader>
          <CardTitle className="text-lg">Welcome back</CardTitle>
          <CardDescription>
            Enter your email and password to sign in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form noValidate onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
            <FieldGroup>
              {errors.root && (
                <Alert variant="destructive">
                  <AlertCircle aria-hidden />
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
                  className="bg-white/60 dark:bg-slate-950/40"
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
                  className="bg-white/60 dark:bg-slate-950/40"
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
      <p className="text-center text-xs text-muted-foreground">
        No account? Ask your helpdesk administrator.
      </p>
    </main>
  );
}

/**
 * Decorative backdrop for the frosted-glass card: a pastel gradient, faint
 * glows in the corners, and two saturated orbs placed around the page centre
 * so they sit partly behind the card and show through its blur. Everything
 * drifts slowly (paused when the user prefers reduced motion).
 */
function LoginBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute inset-0 bg-linear-to-br from-sky-200 via-indigo-200 to-violet-300 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950" />
      <div className="absolute -top-[25vmax] -left-[20vmax] size-[55vmax] rounded-full bg-sky-400/35 blur-[100px] motion-safe:animate-drift dark:bg-sky-600/20" />
      <div className="absolute -right-[20vmax] -bottom-[25vmax] size-[55vmax] rounded-full bg-fuchsia-300/40 blur-[100px] motion-safe:animate-drift motion-safe:[animation-delay:-12s] dark:bg-violet-600/20" />
      <div className="absolute inset-0 bg-[radial-gradient(var(--color-slate-900)_1px,transparent_1px)] bg-size-[24px_24px] opacity-[0.06] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)] dark:bg-[radial-gradient(var(--color-white)_1px,transparent_1px)]" />
      {/* Orbs, positioned from the page centre (where the card is). */}
      <div className="absolute top-1/2 left-1/2 size-[28rem] -translate-x-[110%] -translate-y-[45%] rounded-full bg-linear-to-br from-blue-500 to-cyan-400 opacity-80 blur-3xl motion-safe:animate-drift dark:opacity-60" />
      <div className="absolute top-1/2 left-1/2 size-[32rem] translate-x-[8%] -translate-y-[18%] rounded-full bg-linear-to-br from-indigo-500 to-fuchsia-400 opacity-70 blur-3xl motion-safe:animate-drift motion-safe:[animation-delay:-10s] dark:opacity-50" />
    </div>
  );
}
