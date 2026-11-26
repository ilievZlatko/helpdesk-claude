import { ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { healthResponseSchema } from '@helpdesk/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  let controller: HealthController;
  const prisma = { isHealthy: vi.fn<() => Promise<boolean>>() };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: prisma }],
    }).compile();

    controller = moduleRef.get(HealthController);
  });

  it('returns a response matching the shared schema when the database is up', async () => {
    prisma.isHealthy.mockResolvedValue(true);

    const result = healthResponseSchema.safeParse(await controller.check());

    expect(result.success).toBe(true);
  });

  it('throws 503 when the database is down', async () => {
    prisma.isHealthy.mockResolvedValue(false);

    await expect(controller.check()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
