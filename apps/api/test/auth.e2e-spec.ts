import { Controller, Get, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';

// A route with no @AllowAnonymous(), so the global AuthGuard protects it.
@Controller('protected')
class ProtectedController {
  @Get()
  me(@Session() session: UserSession) {
    return { email: session.user.email };
  }
}

const ORIGIN = 'http://localhost:5173';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const password = 'correct-horse-battery';

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

  const signUp = () =>
    request(app.getHttpServer())
      .post('/api/auth/sign-up/email')
      .send({ email, password, name: 'E2E User' });

  function sessionCookie(res: request.Response): string {
    const cookies = res.get('Set-Cookie') ?? [];
    const cookie = cookies.find((c) => c.includes('session_token='));
    expect(cookie).toBeDefined();
    return cookie!.split(';')[0]!;
  }

  it('signs up, reads the session, and reaches a guarded route', async () => {
    const res = await signUp().expect(200);
    const cookie = sessionCookie(res);

    const session = await request(app.getHttpServer())
      .get('/api/auth/get-session')
      .set('Cookie', cookie)
      .expect(200);
    expect(session.body.user.email).toBe(email);

    await request(app.getHttpServer())
      .get('/api/protected')
      .set('Cookie', cookie)
      .expect(200, { email });
  });

  it('rejects anonymous requests to guarded routes', async () => {
    await request(app.getHttpServer()).get('/api/protected').expect(401);
    const res = await request(app.getHttpServer())
      .get('/api/auth/get-session')
      .expect(200);
    expect(res.body).toBeNull();
  });

  it('rejects a wrong password', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/sign-in/email')
      .send({ email, password: 'wrong-password-123' })
      .expect(401);
  });

  it('signs in and invalidates the session on sign-out', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/sign-in/email')
      .send({ email, password })
      .expect(200);
    const cookie = sessionCookie(res);

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
