import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { authClient } from '@/modules/auth/auth-client';
import { UserAvatar } from '@/modules/auth/user-avatar';
import { roleLabel } from '@/modules/auth/user-display';
import { PageHeader } from '@/modules/layouts/page-header';

export function AccountPage() {
  const { data: session } = authClient.useSession();
  if (!session) return null;
  const { user } = session;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <PageHeader title="Account" description="Who you are signed in as." />

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
    </div>
  );
}
