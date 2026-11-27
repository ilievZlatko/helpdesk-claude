import type { UserRole } from '@helpdesk/shared';
import { Navigate, Outlet, useLocation } from 'react-router';
import { authClient } from '@/modules/auth/auth-client';
import {
  useRedirectAfterLogin,
  type LoginLocationState,
} from '@/modules/auth/login-redirect';

function FullPageMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

/** Renders the child routes only for signed-in users; sends others to /login. */
export function RequireAuth() {
  const { data: session, isPending } = authClient.useSession();
  const location = useLocation();

  if (isPending) return <FullPageMessage>Loading…</FullPageMessage>;
  if (!session) {
    const state: LoginLocationState = { from: location };
    return <Navigate to="/login" replace state={state} />;
  }
  return <Outlet />;
}

/** Renders the child routes only for signed-out users (the login page). */
export function RequireGuest() {
  const { data: session, isPending } = authClient.useSession();
  const redirectTo = useRedirectAfterLogin();

  if (isPending) return <FullPageMessage>Loading…</FullPageMessage>;
  if (session) return <Navigate to={redirectTo} replace />;
  return <Outlet />;
}

/**
 * Renders the child routes only for users with one of `roles`; sends anyone
 * else home. Use inside <RequireAuth />. This only hides UI: the API enforces
 * roles itself (`@Roles([...])`).
 */
export function RequireRole({ roles }: { roles: UserRole[] }) {
  const { data: session } = authClient.useSession();
  const role = session?.user.role;

  if (!role || !roles.some((allowed) => allowed === role)) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
