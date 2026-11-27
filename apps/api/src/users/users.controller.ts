import { Controller, Get } from '@nestjs/common';
import { currentUserSchema, type CurrentUser } from '@helpdesk/shared';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import type { Auth } from '../auth/auth.js';

@Controller('users')
export class UsersController {
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
