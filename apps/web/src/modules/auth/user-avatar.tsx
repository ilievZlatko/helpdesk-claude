import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { avatarColor, userInitials } from './user-display';

type UserAvatarProps = {
  user: { name: string; email: string; image?: string | null };
  /**
   * Give the initials a per-user colour (see `avatarColor`), to tell people
   * apart in lists. Off by default: the signed-in user's own avatar is blue.
   */
  colorful?: boolean;
  className?: string;
};

/** The user's photo, or their initials on a circle when there is none. */
export function UserAvatar({ user, colorful, className }: UserAvatarProps) {
  return (
    <Avatar className={cn('size-8', className)}>
      {user.image && <AvatarImage src={user.image} alt="" />}
      <AvatarFallback
        className={cn(
          'font-medium',
          colorful
            ? avatarColor(user.email)
            : 'bg-primary/10 text-primary dark:bg-primary/25 dark:text-blue-200',
        )}
      >
        {userInitials(user.name, user.email)}
      </AvatarFallback>
    </Avatar>
  );
}
