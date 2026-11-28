import { UserRole, UserStatus } from '@helpdesk/shared';
import { Badge } from '@/components/ui/badge';
import { roleLabel } from '@/modules/auth/user-display';
import { cn } from '@/lib/utils';

export function RoleBadge({ role }: { role: UserRole }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        role === UserRole.Admin
          ? 'border-primary/30 bg-primary/10 text-primary dark:bg-primary/20 dark:text-blue-200'
          : 'bg-secondary text-secondary-foreground',
      )}
    >
      {roleLabel(role)}
    </Badge>
  );
}

const statusLabels: Record<UserStatus, string> = {
  [UserStatus.Active]: 'Active',
  [UserStatus.Deactivated]: 'Deactivated',
};

export function StatusBadge({ status }: { status: UserStatus }) {
  const active = status === UserStatus.Active;
  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1.5',
        active
          ? 'border-emerald-600/30 bg-emerald-600/10 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300'
          : 'border-border bg-muted text-muted-foreground',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'size-1.5 rounded-full',
          active ? 'bg-emerald-600 dark:bg-emerald-400' : 'bg-slate-400',
        )}
      />
      {statusLabels[status]}
    </Badge>
  );
}
