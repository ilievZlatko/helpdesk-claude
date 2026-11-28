import { Controller, Get, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Roles, Session, type UserSession } from '@thallesp/nestjs-better-auth';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { UserRole } from '@helpdesk/shared';
import { inject } from 'vitest';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';
import { CreatedSessions } from './sessions.js';

// A route with no @AllowAnonymous(), so the global AuthGuard protects it.
@Controller('protected')
class ProtectedController {
  @Get()
  me(@Session() session: UserSession) {
    return { email: session.user.email };
  }

  @Get('admin')
  @Roles([UserRole.Admin])
  adminOnly() {
    return { ok: true };
  }
}

const ORIGIN = 'http://localhost:5173';

// Created by test/global-setup.ts before any e2e file runs.
const seedUser = inject('seedUser');
const adminUser = inject('adminUser');

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [ProtectedController],
    }).compile();

    app = moduleFixture.createNestApplication({ bodyParser: false });
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  function sessionCookie(res: request.Response): string {
    const cookies = res.get('Set-Cookie') ?? [];
    const cookie = cookies.find((c) => c.includes('session_token='));
    expect(cookie).toBeDefined();
    return sessions.track(cookie!.split(';')[0]!);
  }

  const signIn = (password = seedUser.password, email = seedUser.email) =>
    request(app.getHttpServer())
      .post('/api/auth/sign-in/email')
      .send({ email, password });

  // Sessions created by these tests, removed in afterAll so a manual login as
  // the same users is not affected.
  const sessions = new CreatedSessions();
  afterAll(async () => {
    await sessions.deleteAll(app.get(PrismaService));
  });

  describe('sign-up', () => {
    it('is disabled and creates no user', async () => {
      const email = `jordan.ellis+${Date.now()}@example.com`;

      const res = await request(app.getHttpServer())
        .post('/api/auth/sign-up/email')
        .send({
          email,
          password: 'correct-horse-battery',
          name: 'Jordan Ellis',
        })
        .expect(400);
      expect(res.body.code).toBe('EMAIL_PASSWORD_SIGN_UP_DISABLED');
      expect(res.get('Set-Cookie')).toBeUndefined();

      const user = await app
        .get(PrismaService)
        .user.findUnique({ where: { email } });
      expect(user).toBeNull();
    });
  });

  describe('sign-in (seeded user)', () => {
    it('signs in and reads the session', async () => {
      const cookie = sessionCookie(await signIn().expect(200));

      const session = await request(app.getHttpServer())
        .get('/api/auth/get-session')
        .set('Cookie', cookie)
        .expect(200);
      expect(session.body.user).toMatchObject({
        email: seedUser.email,
        name: seedUser.name,
      });

      await request(app.getHttpServer())
        .get('/api/protected')
        .set('Cookie', cookie)
        .expect(200, { email: seedUser.email });
    });

    it('rejects a wrong password', async () => {
      await signIn('wrong-password-123').expect(401);
    });

    it('invalidates the session on sign-out', async () => {
      const cookie = sessionCookie(await signIn().expect(200));

      await request(app.getHttpServer())
        .post('/api/auth/sign-out')
        .set('Cookie', cookie)
        .set('Origin', ORIGIN)
        .send({})
        .expect(200);

      await request(app.getHttpServer())
        .get('/api/protected')
        .set('Cookie', cookie)
        .expect(401);
    });
  });

  describe('roles', () => {
    it('gives the seeded admin the admin role and agents the agent role', async () => {
      const admin = sessionCookie(
        await signIn(adminUser.password, adminUser.email).expect(200),
      );
      const agent = sessionCookie(await signIn().expect(200));

      const adminSession = await request(app.getHttpServer())
        .get('/api/auth/get-session')
        .set('Cookie', admin)
        .expect(200);
      expect(adminSession.body.user.role).toBe(UserRole.Admin);

      const agentSession = await request(app.getHttpServer())
        .get('/api/auth/get-session')
        .set('Cookie', agent)
        .expect(200);
      expect(agentSession.body.user.role).toBe(UserRole.Agent);
    });

    it('lets only admins reach @Roles([UserRole.Admin]) routes and admin endpoints', async () => {
      const admin = sessionCookie(
        await signIn(adminUser.password, adminUser.email).expect(200),
      );
      const agent = sessionCookie(await signIn().expect(200));

      await request(app.getHttpServer())
        .get('/api/protected/admin')
        .set('Cookie', admin)
        .expect(200);
      await request(app.getHttpServer())
        .get('/api/protected/admin')
        .set('Cookie', agent)
        .expect(403);

      await request(app.getHttpServer())
        .get('/api/auth/admin/list-users')
        .set('Cookie', admin)
        .expect(200);
      await request(app.getHttpServer())
        .get('/api/auth/admin/list-users')
        .set('Cookie', agent)
        .expect(403);
    });
  });

  it('rejects anonymous requests to guarded routes', async () => {
    await request(app.getHttpServer()).get('/api/protected').expect(401);
    const res = await request(app.getHttpServer())
      .get('/api/auth/get-session')
      .expect(200);
    expect(res.body).toBeNull();
  });
});
