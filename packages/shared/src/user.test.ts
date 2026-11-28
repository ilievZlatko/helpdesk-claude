import {
  UserRole,
  UserStatus,
  currentUserSchema,
  userListResponseSchema,
  userRoleSchema,
  userStatusSchema,
} from './user.js';

describe('UserRole', () => {
  it('has the admin and agent roles', () => {
    expect(Object.values(UserRole)).toEqual(['admin', 'agent']);
  });

  it('is what userRoleSchema accepts', () => {
    expect(userRoleSchema.options).toEqual(Object.values(UserRole));
    expect(userRoleSchema.safeParse('superuser').success).toBe(false);
  });
});

describe('currentUserSchema', () => {
  const user = {
    id: 'u_123',
    name: 'Maya Thompson',
    email: 'maya.thompson@example.com',
    role: UserRole.Agent,
    image: null,
  };

  it('accepts a valid current user', () => {
    expect(currentUserSchema.safeParse(user).success).toBe(true);
  });

  it('rejects an unknown role', () => {
    expect(
      currentUserSchema.safeParse({ ...user, role: 'superuser' }).success,
    ).toBe(false);
  });
});

describe('UserStatus', () => {
  it('has the active and deactivated statuses', () => {
    expect(Object.values(UserStatus)).toEqual(['active', 'deactivated']);
    expect(userStatusSchema.options).toEqual(Object.values(UserStatus));
  });
});

describe('userListResponseSchema', () => {
  const user = {
    id: 'u_123',
    name: 'Maya Thompson',
    email: 'maya.thompson@example.com',
    role: UserRole.Agent,
    status: UserStatus.Active,
    image: null,
    createdAt: '2026-11-28T10:00:00.000Z',
  };

  it('accepts a list of users', () => {
    expect(userListResponseSchema.safeParse({ users: [user] }).success).toBe(
      true,
    );
    expect(userListResponseSchema.safeParse({ users: [] }).success).toBe(true);
  });

  it.each([
    ['an unknown status', { status: 'suspended' }],
    ['an unknown role', { role: 'superuser' }],
    ['a createdAt that is not an ISO timestamp', { createdAt: 'yesterday' }],
  ])('rejects %s', (_, change) => {
    expect(
      userListResponseSchema.safeParse({ users: [{ ...user, ...change }] })
        .success,
    ).toBe(false);
  });
});
