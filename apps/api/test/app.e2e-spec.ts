import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { healthResponseSchema } from '@helpdesk/shared';
import { AppModule } from './../src/app.module.js';

describe('App (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({ bodyParser: false });
    app.setGlobalPrefix('api');
    await app.init();
  });

  it('GET /api/health', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200);
    expect(healthResponseSchema.safeParse(response.body).success).toBe(true);
  });

  afterEach(async () => {
    await app.close();
  });
});
