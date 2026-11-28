import { UserRole, UserStatus } from '@helpdesk/shared';
import type { PrismaService } from '../prisma/prisma.service.js';
import { UsersService, userStatus } from './users.service.js';

const now = new Date('2026-11-28T12:00:00.000Z');
const hourAgo = new Date('2026-11-28T11:00:00.000Z');
const inAnHour = new Date('2026-11-28T13:00:00.000Z');

describe('userStatus', () => {
  it.each([
    ['not banned', { banned: false, banExpires: null }, UserStatus.Active],
    ['banned is null', { banned: null, banExpires: null }, UserStatus.Active],
    [
      'banned without expiry',
      { banned: true, banExpires: null },
      UserStatus.Deactivated,
    ],
    [
      'banned until later',
      { banned: true, banExpires: inAnHour },
      UserStatus.Deactivated,
    ],
    [
      'banned until a time that has passed',
      { banned: true, banExpires: hourAgo },
      UserStatus.Active,
    ],
  ])('%s', (_, ban, expected) => {
    expect(userStatus(ban, now)).toBe(expected);
  });
});

describe('UsersService.list', () => {
  const findMany = vi.fn();
  const service = new UsersService({
    user: { findMany },
  } as unknown as PrismaService);

  beforeEach(() => findMany.mockReset());

  it('selects only the listed fields, sorted by name then email', async () => {
    findMany.mockResolvedValue([]);
    await service.list(now);

    expect(findMany).toHaveBeenCalledWith({
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
  });

  it('maps the ban to a status and createdAt to an ISO string', async () => {
    const createdAt = new Date('2026-01-02T03:04:05.000Z');
    findMany.mockResolvedValue([
      {
        id: 'u_1',
        name: 'Liam Chen',
        email: 'liam.chen@example.com',
        role: UserRole.Agent,
        image: null,
        banned: true,
        banExpires: null,
        createdAt,
      },
    ]);

    await expect(service.list(now)).resolves.toEqual([
      {
        id: 'u_1',
        name: 'Liam Chen',
        email: 'liam.chen@example.com',
        role: UserRole.Agent,
        image: null,
        status: UserStatus.Deactivated,
        createdAt: '2026-01-02T03:04:05.000Z',
      },
    ]);
  });
});
