import { currentUserSchema } from './user.js';

describe('currentUserSchema', () => {
  const user = {
    id: 'u_123',
    name: 'Maya Thompson',
    email: 'maya.thompson@example.com',
    role: 'agent',
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
