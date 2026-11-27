import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { authClient } from '@/modules/auth/auth-client';
import { UserAvatar } from '@/modules/auth/user-avatar';
import { roleLabel } from '@/modules/auth/user-display';
import { useTheme } from '@/modules/theme/theme';
import { themeOptions } from '@/modules/theme/theme-options';

export function SettingsPage() {
  const { data: session } = authClient.useSession();
  const { theme, setTheme } = useTheme();
  if (!session) return null;
  const { user } = session;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Your account and how the helpdesk looks for you.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Your name and email are managed by an administrator.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <UserAvatar user={user} className="size-14 text-lg" />
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Name</dt>
            <dd className="font-medium">{user.name}</dd>
            <dt className="text-muted-foreground">Email</dt>
            <dd>{user.email}</dd>
            <dt className="text-muted-foreground">Role</dt>
            <dd>{roleLabel(user.role) ?? '—'}</dd>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Choose a theme, or follow your system setting.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            role="radiogroup"
            aria-label="Theme"
            className="grid grid-cols-3 gap-2 sm:max-w-sm"
          >
            {themeOptions.map(({ value, label, Icon }) => (
              <Button
                key={value}
                type="button"
                role="radio"
                aria-checked={theme === value}
                variant={theme === value ? 'default' : 'outline'}
                onClick={() => setTheme(value)}
              >
                <Icon aria-hidden />
                {label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
