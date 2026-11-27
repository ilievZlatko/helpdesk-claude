import { GearIcon, PowerIcon, UserCircleIcon } from '@phosphor-icons/react';
import { Link } from 'react-router';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { authClient } from './auth-client';
import { UserAvatar } from './user-avatar';
import { roleLabel } from './user-display';
import { useSignOut } from './use-sign-out';

/**
 * Avatar button for the header. Opens a menu with who is signed in (static,
 * not an item), Account, Settings, and Sign out. Navigation (e.g. Users) lives
 * in the sidebar and the theme switch in the header, not here.
 */
export function UserMenu() {
  const { data: session } = authClient.useSession();
  const signOut = useSignOut();

  if (!session) return null;
  const { user } = session;
  const role = roleLabel(user.role);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        aria-label="Open user menu"
      >
        <UserAvatar user={user} />
      </DropdownMenuTrigger>
      {/* Sized to its longest line (usually the email), capped so a very
          long email is truncated instead of stretching the menu. */}
      <DropdownMenuContent align="end" className="max-w-80">
        <DropdownMenuLabel className="flex items-center gap-3 py-2 font-normal">
          <UserAvatar user={user} className="size-9" />
          <div className="grid min-w-0 leading-tight">
            <span className="truncate font-medium">{user.name}</span>
            <span
              className="truncate text-xs text-muted-foreground"
              title={user.email}
            >
              {user.email}
            </span>
            {role && (
              <span className="mt-0.5 text-xs text-muted-foreground">
                {role}
              </span>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/account">
            <UserCircleIcon aria-hidden />
            Account
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/settings">
            <GearIcon aria-hidden />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => void signOut()}>
          <PowerIcon aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
