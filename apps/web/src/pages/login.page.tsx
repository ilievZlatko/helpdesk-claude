import { LifebuoyIcon } from '@phosphor-icons/react';
import { useNavigate } from 'react-router';
import { ThemeToggle } from '@/modules/theme/theme-toggle';
import { LoginBackground } from '@/components/login-background';
import { LoginForm } from '@/modules/auth/login-form';
import { useRedirectAfterLogin } from '@/modules/auth/login-redirect';

export function LoginPage() {
  const navigate = useNavigate();
  const redirectTo = useRedirectAfterLogin();

  return (
    <main className="relative isolate flex min-h-svh flex-col items-center justify-center gap-8 overflow-hidden p-6">
      <LoginBackground />
      <ThemeToggle className="absolute top-4 right-4 hover:bg-white/40 dark:hover:bg-white/10" />
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
          <LifebuoyIcon className="size-6" aria-hidden />
        </div>
        <div>
          <p className="text-xl font-semibold tracking-tight">Helpdesk</p>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            AI-powered support, from inbox to answer
          </p>
        </div>
      </div>
      <LoginForm
        onSuccess={() => void navigate(redirectTo, { replace: true })}
      />
      <p className="text-center text-xs text-slate-700 dark:text-slate-300">
        No account? Ask your helpdesk administrator.
      </p>
    </main>
  );
}
