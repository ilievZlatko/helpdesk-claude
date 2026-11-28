import { Controller, Get, Inject } from '@nestjs/common';
import {
  UserRole,
  currentUserSchema,
  userListResponseSchema,
  type CurrentUser,
  type UserListResponse,
} from '@helpdesk/shared';
import { Roles, Session, type UserSession } from '@thallesp/nestjs-better-auth';
import type { Auth } from '../auth/auth.js';
import { UsersService } from './users.service.js';

@Controller('users')
export class UsersController {
  constructor(@Inject(UsersService) private readonly users: UsersService) {}

  /** All users, for the admin's user list. Agents get 403. */
  @Get()
  @Roles([UserRole.Admin])
  async list(): Promise<UserListResponse> {
    return userListResponseSchema.parse({ users: await this.users.list() });
  }

  /**
   * The signed-in user. The global AuthGuard has already loaded the session
   * (and user) from the database, so this needs no extra query.
   */
  @Get('me')
  me(@Session() session: UserSession<Auth>): CurrentUser {
    const { id, name, email, role, image } = session.user;
    return currentUserSchema.parse({
      id,
      name,
      email,
      role,
      image: image ?? null,
    });
  }
}
