import { LifeBuoy } from 'lucide-react';
import { Link, Outlet } from 'react-router';
import { UserMenu } from '@/modules/auth/user-menu';

/** Shell for signed-in pages: a top nav bar with the logo and the user menu. */
export function AppLayout() {
  return (
    <div className="flex min-h-svh flex-col bg-linear-to-br from-slate-100 via-sky-50 to-indigo-50 bg-fixed dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950">
      {/* Sticky, translucent header: content scrolls under it, blurred. Falls
          back to near-opaque where backdrop-filter is unsupported. */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
        <nav className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <LifeBuoy className="size-5 text-primary" aria-hidden />
            Helpdesk
          </Link>
          <UserMenu />
        </nav>
      </header>
      <main className="w-full flex-1 px-4 py-4 sm:px-6 md:py-6">
        <Outlet />
      </main>
    </div>
  );
}
