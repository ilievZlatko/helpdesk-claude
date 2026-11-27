import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { userInitials } from './user-display';

type UserAvatarProps = {
  user: { name: string; email: string; image?: string | null };
  className?: string;
};

/** The user's photo, or their initials on a blue circle when there is none. */
export function UserAvatar({ user, className }: UserAvatarProps) {
  return (
    <Avatar className={cn('size-8', className)}>
      {user.image && <AvatarImage src={user.image} alt="" />}
      <AvatarFallback className="bg-primary/10 font-medium text-primary dark:bg-primary/25 dark:text-blue-200">
        {userInitials(user.name, user.email)}
      </AvatarFallback>
    </Avatar>
  );
}
