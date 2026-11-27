import { UserRole } from '@helpdesk/shared';
import { House, LifeBuoy, LogOut, Users, type LucideIcon } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { authClient } from '@/modules/auth/auth-client';
import { useSignOut } from '@/modules/auth/use-sign-out';

type NavItem = {
  label: string;
  to: string;
  Icon: LucideIcon;
  /** Only users with one of these roles see the item; everyone when omitted. */
  roles?: UserRole[];
};

const navItems: NavItem[] = [
  { label: 'Home', to: '/', Icon: House },
  { label: 'Users', to: '/users', Icon: Users, roles: [UserRole.Admin] },
];

function isActive(pathname: string, to: string) {
  return to === '/' ? pathname === '/' : pathname.startsWith(to);
}

/**
 * Collapsible left navigation: logo (plus the app name when expanded), then
 * the menu items the current user may see, and Sign out at the bottom.
 * Collapses to an icon rail on desktop and slides in as a sheet on small
 * screens.
 */
export function AppSidebar() {
  const { data: session } = authClient.useSession();
  const { pathname } = useLocation();
  const signOut = useSignOut();
  const role = session?.user.role;
  const items = navItems.filter(
    (item) => !item.roles || item.roles.some((allowed) => allowed === role),
  );

  return (
    <Sidebar
      collapsible="icon"
      className="border-sidebar-border backdrop-blur-xl"
    >
      {/* Same height as the page header (h-14), content centred, so the
          logo lines up with the header row. */}
      <SidebarHeader className="h-14 justify-center">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              tooltip="Helpdesk"
              className="h-10 py-1 hover:bg-transparent hover:text-sidebar-foreground active:bg-transparent active:text-sidebar-foreground"
            >
              <Link to="/">
                <span className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm shadow-primary/30">
                  <LifeBuoy className="size-4" aria-hidden />
                </span>
                <span className="text-base font-semibold">Helpdesk</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <nav aria-label="Main">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map(({ label, to, Icon }) => (
                  <SidebarMenuItem key={to}>
                    <SidebarMenuButton
                      asChild
                      tooltip={label}
                      isActive={isActive(pathname, to)}
                    >
                      <Link to={to}>
                        <Icon aria-hidden />
                        <span>{label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </nav>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Sign out"
              onClick={() => void signOut()}
              className="hover:bg-destructive/10 hover:text-destructive dark:hover:bg-destructive/20 [&:hover>svg]:text-destructive"
            >
              <LogOut aria-hidden />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
