import { useQueryClient } from '@tanstack/react-query';
import { LifeBuoy, LogOut } from 'lucide-react';
import { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { authClient } from '@/modules/auth/auth-client';
import { ThemeToggle } from '@/modules/theme/theme-toggle';

/** Shell for signed-in pages: a top nav bar with the current user. */
export function AppLayout() {
  const { data: session } = authClient.useSession();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await authClient.signOut();
    } finally {
      // Drop cached server data so the next user starts clean.
      queryClient.clear();
      setSigningOut(false);
      void navigate('/login', { replace: true });
    }
  }

  return (
    <div className="flex min-h-svh flex-col bg-muted">
      {/* Sticky, translucent header: content scrolls under it, blurred. Falls
          back to near-opaque where backdrop-filter is unsupported. */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
        <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <LifeBuoy className="size-5 text-primary" aria-hidden />
            Helpdesk
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <span className="text-sm font-medium">{session?.user.name}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleSignOut()}
              disabled={signingOut}
            >
              <LogOut aria-hidden />
              Sign out
            </Button>
          </div>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}
