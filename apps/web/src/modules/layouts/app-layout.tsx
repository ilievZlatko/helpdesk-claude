import { Outlet } from 'react-router';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { UserMenu } from '@/modules/auth/user-menu';
import { ThemeSwitch } from '@/modules/theme/theme-switch';
import { AppSidebar } from './app-sidebar';
import { HeaderSearch } from './header-search';
import { NotificationsMenu } from './notifications-menu';

/**
 * Shell for signed-in pages: the collapsible sidebar on the left, and a
 * transparent header (sidebar toggle, search, notifications, theme switch,
 * user menu) over the page background.
 */
/** Round, bordered, translucent icon buttons in the header (sidebar toggle,
 * bell, theme). */
const headerIconButton =
  'bg-background/60 shadow-none backdrop-blur-md dark:bg-white/5 dark:hover:bg-white/10';

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
          <SidebarTrigger
            variant="outline"
            size="icon-sm"
            className={cn('size-8 shrink-0 rounded-full', headerIconButton)}
          />
          <HeaderSearch className="mx-auto" />
          <div className="flex shrink-0 items-center gap-2">
            <NotificationsMenu className={headerIconButton} />
            <ThemeSwitch className={headerIconButton} />
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
