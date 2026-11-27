import { UserRole, currentUserSchema, userRoleSchema } from './user.js';

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
