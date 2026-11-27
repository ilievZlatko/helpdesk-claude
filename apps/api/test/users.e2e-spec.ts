import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { currentUserSchema } from '@helpdesk/shared';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { inject } from 'vitest';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

// Created by test/global-setup.ts before any e2e file runs.
const agent = inject('seedUser');
const admin = inject('adminUser');

describe('Users (e2e)', () => {
  let app: INestApplication<App>;
  const startedAt = new Date();

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({ bodyParser: false });
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    // Remove only the sessions these tests created.
    await app.get(PrismaService).session.deleteMany({
      where: {
        user: { email: { in: [agent.email, admin.email] } },
        createdAt: { gte: startedAt },
      },
    });
    await app.close();
  });

  async function signIn(email: string, password: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/auth/sign-in/email')
      .send({ email, password })
      .expect(200);
    const cookie = (res.get('Set-Cookie') ?? []).find((c) =>
      c.includes('session_token='),
    );
    expect(cookie).toBeDefined();
    return cookie!.split(';')[0]!;
  }

  describe('GET /api/users/me', () => {
    it('returns 401 without a session', async () => {
      await request(app.getHttpServer()).get('/api/users/me').expect(401);
    });

    it('returns the signed-in agent', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/users/me')
        .set('Cookie', await signIn(agent.email, agent.password))
        .expect(200);

      const me = currentUserSchema.parse(res.body);
      expect(me).toMatchObject({
        name: agent.name,
        email: agent.email,
        role: 'agent',
      });
      // Only the public fields are returned.
      expect(Object.keys(res.body).sort()).toEqual(
        ['email', 'id', 'image', 'name', 'role'].sort(),
      );
    });

    it('returns the admin role for the admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/users/me')
        .set('Cookie', await signIn(admin.email, admin.password))
        .expect(200);

      expect(currentUserSchema.parse(res.body)).toMatchObject({
        email: admin.email,
        role: 'admin',
      });
    });
  });
});
