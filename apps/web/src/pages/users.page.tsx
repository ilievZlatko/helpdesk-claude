import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { authClient } from '@/modules/auth/auth-client';
import { UsersList } from '@/modules/users/users-list';
import { PageHeader } from '@/modules/layouts/page-header';

export function UsersPage() {
  const { data: session } = authClient.useSession();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Users"
        description="Everyone who can sign in to the helpdesk."
      />

      <Card>
        <CardHeader>
          <CardTitle>All users</CardTitle>
          <CardDescription>
            Admins manage users; agents work on tickets.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UsersList currentUserId={session?.user.id} />
        </CardContent>
      </Card>
    </div>
  );
}
