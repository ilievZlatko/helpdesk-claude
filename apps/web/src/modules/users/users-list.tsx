import type { UserListItem } from '@helpdesk/shared';
import { WarningCircleIcon } from '@phosphor-icons/react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { UserAvatar } from '@/modules/auth/user-avatar';
import { RoleBadge, StatusBadge } from './components/user-badges';
import { useUsers } from './users-api';

const dateFormat = new Intl.DateTimeFormat('en', { dateStyle: 'medium' });

type UsersListProps = {
  /** The signed-in user's id, to mark their own row. */
  currentUserId?: string;
};

/** The user list: a table of every user, with loading, error and empty states. */
export function UsersList({ currentUserId }: UsersListProps) {
  const users = useUsers();

  if (users.isPending) return <UsersTableSkeleton />;

  if (users.isError) {
    return (
      <Alert variant="destructive">
        <WarningCircleIcon aria-hidden />
        <AlertTitle>Could not load users.</AlertTitle>
        <AlertDescription className="flex flex-wrap items-center gap-3">
          Check your connection and try again.
          <Button
            variant="outline"
            size="sm"
            onClick={() => void users.refetch()}
            disabled={users.isFetching}
          >
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (users.data.length === 0) {
    return <p className="text-sm text-muted-foreground">No users yet.</p>;
  }

  return <UsersTable users={users.data} currentUserId={currentUserId} />;
}

function UsersTable({
  users,
  currentUserId,
}: {
  users: UserListItem[];
  currentUserId?: string;
}) {
  return (
    // Fixed layout: Role, Status and Added get set shares of the width and
    // User takes the rest, truncating long names and emails, so nothing
    // overflows. Phones show User and Status (with the role under the email);
    // tablets add Role; desktops add Added. Leaves room for a narrow actions
    // column (a "⋯" menu, w-12) at the end.
    <Table className="table-fixed">
      <TableHeader>
        <TableRow>
          <TableHead>User</TableHead>
          <TableHead className="hidden sm:table-cell sm:w-[16%] lg:w-[15%]">
            Role
          </TableHead>
          <TableHead className="w-32 sm:w-[26%] lg:w-[18%]">Status</TableHead>
          <TableHead className="hidden lg:table-cell lg:w-[17%]">
            Added
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            {/* On small screens it also shows the role. */}
            <TableCell>
              <div className="flex items-center gap-3">
                <UserAvatar user={user} colorful />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-medium">
                    <span className="truncate">{user.name}</span>
                    {user.id === currentUserId && (
                      <span className="shrink-0 text-xs font-normal text-muted-foreground">
                        (you)
                      </span>
                    )}
                  </div>
                  <div className="truncate text-muted-foreground">
                    {user.email}
                  </div>
                  <div className="mt-1 sm:hidden">
                    <RoleBadge role={user.role} />
                  </div>
                </div>
              </div>
            </TableCell>
            <TableCell className="hidden sm:table-cell">
              <RoleBadge role={user.role} />
            </TableCell>
            <TableCell>
              <StatusBadge status={user.status} />
            </TableCell>
            <TableCell className="hidden text-muted-foreground lg:table-cell">
              <time dateTime={user.createdAt}>
                {dateFormat.format(new Date(user.createdAt))}
              </time>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function UsersTableSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading users" className="space-y-3">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-5 w-14" />
          <Skeleton className="h-5 w-16" />
        </div>
      ))}
    </div>
  );
}
