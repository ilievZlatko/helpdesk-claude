import { Test } from '@nestjs/testing';
import { UserRole, currentUserSchema } from '@helpdesk/shared';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import type { Auth } from '../auth/auth.js';
import { UsersController } from './users.controller.js';

describe('UsersController', () => {
  let controller: UsersController;

  const session = (user: Record<string, unknown>) =>
    ({
      user: {
        id: 'u_123',
        name: 'Maya Thompson',
        email: 'maya.thompson@example.com',
        emailVerified: true,
        image: undefined,
        role: UserRole.Agent,
        banned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...user,
      },
      session: {},
    }) as unknown as UserSession<Auth>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
    }).compile();
    controller = moduleRef.get(UsersController);
  });

  it('returns only the public fields of the current user', () => {
    const me = controller.me(session({}));

    expect(me).toEqual({
      id: 'u_123',
      name: 'Maya Thompson',
      email: 'maya.thompson@example.com',
      role: UserRole.Agent,
      image: null,
    });
    expect(currentUserSchema.safeParse(me).success).toBe(true);
  });

  it('returns the admin role for admins', () => {
    expect(controller.me(session({ role: UserRole.Admin })).role).toBe(
      UserRole.Admin,
    );
  });

  it('fails loudly on a role outside admin | agent', () => {
    expect(() => controller.me(session({ role: 'user' }))).toThrow();
  });
});
