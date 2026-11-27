import { Outlet } from 'react-router';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { UserMenu } from '@/modules/auth/user-menu';
import { AppSidebar } from './app-sidebar';
import { HeaderSearch } from './header-search';
import { NotificationsMenu } from './notifications-menu';

/**
 * Shell for signed-in pages: the collapsible sidebar on the left, and a
 * transparent header (sidebar toggle, search, notifications, user menu) over
 * the page background.
 */
export function AppLayout() {
  return (
    <SidebarProvider
      // Expanded width (shadcn's default is 16rem).
      style={{ '--sidebar-width': '14rem' } as React.CSSProperties}
      className="bg-linear-to-br from-slate-100 via-sky-50 to-indigo-50 bg-fixed dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950"
    >
      <AppSidebar />
      <SidebarInset className="bg-transparent">
        {/* Transparent so the page background shows; the blur only matters
            when content scrolls under it. */}
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 px-4 backdrop-blur-md sm:px-6">
          <SidebarTrigger className="-ml-1 shrink-0" />
          <HeaderSearch className="mx-auto" />
          <div className="flex shrink-0 items-center gap-2">
            <NotificationsMenu />
            <UserMenu />
          </div>
        </header>
        {/* SidebarInset is already the page's <main>. pt-2 lines the page
            title up with the first sidebar item. */}
        <div className="w-full flex-1 px-4 pt-2 pb-4 sm:px-6 md:pb-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
