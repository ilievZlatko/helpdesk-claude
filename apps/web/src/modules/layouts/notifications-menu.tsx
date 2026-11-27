import { BellIcon, BellSlashIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * Bell button in the header. There are no notifications yet, so it opens an
 * empty state; it will list notifications once they exist.
 */
export function NotificationsMenu({ className }: { className?: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon-sm"
          className={cn('rounded-full', className)}
          aria-label="Notifications"
        >
          <BellIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
          <BellSlashIcon className="size-5 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium">You're all caught up</p>
          <p className="text-xs text-muted-foreground">
            New notifications will show up here.
          </p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
