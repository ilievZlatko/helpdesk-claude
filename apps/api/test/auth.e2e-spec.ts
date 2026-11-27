import { Controller, Get, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { inject } from 'vitest';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

// A route with no @AllowAnonymous(), so the global AuthGuard protects it.
@Controller('protected')
class ProtectedController {
  @Get()
  me(@Session() session: UserSession) {
    return { email: session.user.email };
  }
}

const ORIGIN = 'http://localhost:5173';

// Created by test/global-setup.ts before any e2e file runs.
const seedUser = inject('seedUser');

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
    return cookie!.split(';')[0]!;
  }

  const signIn = (password = seedUser.password) =>
    request(app.getHttpServer())
      .post('/api/auth/sign-in/email')
      .send({ email: seedUser.email, password });

  describe('sign-up', () => {
    // A new user per run; the seeded users are never modified.
    const email = `jordan.ellis+${Date.now()}@example.com`;

    afterAll(async () => {
      // Sessions and accounts cascade from the user.
      await app.get(PrismaService).user.deleteMany({ where: { email } });
    });

    it('creates a user and starts a session', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/sign-up/email')
        .send({
          email,
          password: 'correct-horse-battery',
          name: 'Jordan Ellis',
        })
        .expect(200);

      await request(app.getHttpServer())
        .get('/api/protected')
        .set('Cookie', sessionCookie(res))
        .expect(200, { email });
    });

    it('rejects an email that is already registered', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/sign-up/email')
        .send({
          email: seedUser.email,
          password: 'another-password-1',
          name: seedUser.name,
        })
        .expect(422);
    });
  });

  describe('sign-in (seeded user)', () => {
    const startedAt = new Date();

    afterAll(async () => {
      // Remove only the sessions these tests created, so a manual login as
      // the same user is not affected.
      await app.get(PrismaService).session.deleteMany({
        where: {
          user: { email: seedUser.email },
          createdAt: { gte: startedAt },
        },
      });
    });

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

  it('rejects anonymous requests to guarded routes', async () => {
    await request(app.getHttpServer()).get('/api/protected').expect(401);
    const res = await request(app.getHttpServer())
      .get('/api/auth/get-session')
      .expect(200);
    expect(res.body).toBeNull();
  });
});
