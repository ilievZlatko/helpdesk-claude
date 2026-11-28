// Session cleanup for e2e files. Test files run in parallel against one
// database, so each file must delete only the sessions it created: deleting
// "this user's sessions since the file started" also removes sessions another
// file is still using.
import type { PrismaService } from '../src/prisma/prisma.service.js';

/** Collects the sessions a test file creates, and deletes them afterwards. */
export class CreatedSessions {
  private readonly tokens: string[] = [];

  /**
   * Records the session behind a `…session_token=<token>.<signature>` cookie
   * (as sent back by sign-in) and returns the cookie unchanged.
   */
  track(cookie: string): string {
    const value = decodeURIComponent(cookie.slice(cookie.indexOf('=') + 1));
    const token = value.split('.')[0];
    if (!token) throw new Error(`Not a session cookie: ${cookie}`);
    this.tokens.push(token);
    return cookie;
  }

  async deleteAll(prisma: PrismaService): Promise<void> {
    await prisma.session.deleteMany({ where: { token: { in: this.tokens } } });
  }
}
