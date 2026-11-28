import { Inject, Injectable } from '@nestjs/common';
import { UserStatus, type UserListItem } from '@helpdesk/shared';
import { PrismaService } from '../prisma/prisma.service.js';

/** The ban fields better-auth's admin plugin keeps on a user. */
interface BanFields {
  banned: boolean | null;
  banExpires: Date | null;
}

/**
 * A user is deactivated while they are banned. A ban with an expiry that has
 * passed no longer counts: better-auth lifts it at the next sign-in.
 */
export function userStatus(
  { banned, banExpires }: BanFields,
  now: Date,
): UserStatus {
  const isBanned = !!banned && (!banExpires || banExpires > now);
  return isBanned ? UserStatus.Deactivated : UserStatus.Active;
}

@Injectable()
export class UsersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /** Every user, sorted by name (then email), with only the listed fields. */
  async list(now = new Date()): Promise<UserListItem[]> {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        banned: true,
        banExpires: true,
        createdAt: true,
      },
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
    });

    return users.map(({ banned, banExpires, createdAt, ...user }) => ({
      ...user,
      status: userStatus({ banned, banExpires }, now),
      createdAt: createdAt.toISOString(),
    }));
  }
}
