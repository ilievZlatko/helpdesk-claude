import { useQueryClient } from '@tanstack/react-query';
import { LogOut, Palette, Settings } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { isTheme, useTheme } from '@/modules/theme/theme';
import { themeOptions } from '@/modules/theme/theme-options';
import { authClient } from './auth-client';
import { UserAvatar } from './user-avatar';
import { roleLabel } from './user-display';

/**
 * Avatar button for the header. Opens a menu with who is signed in (static,
 * not an item), Settings, a Theme submenu, and Sign out.
 */
export function UserMenu() {
  const { data: session } = authClient.useSession();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  if (!session) return null;
  const { user } = session;
  const role = roleLabel(user.role);

  async function signOut() {
    try {
      await authClient.signOut();
    } finally {
      // Drop cached server data so the next user starts clean.
      queryClient.clear();
      void navigate('/login', { replace: true });
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        aria-label="Open user menu"
      >
        <UserAvatar user={user} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
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
          <Link to="/settings">
            <Settings aria-hidden />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Palette aria-hidden />
            Theme
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup
              value={theme}
              onValueChange={(value) => {
                if (isTheme(value)) setTheme(value);
              }}
            >
              {themeOptions.map(({ value, label, Icon }) => (
                <DropdownMenuRadioItem key={value} value={value}>
                  <Icon aria-hidden />
                  {label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => void signOut()}>
          <LogOut aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
