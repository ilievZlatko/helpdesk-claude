import { Test } from '@nestjs/testing';
import { healthResponseSchema } from '@helpdesk/shared';
import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = moduleRef.get(HealthController);
  });

  it('returns a response matching the shared schema', () => {
    const result = healthResponseSchema.safeParse(controller.check());
    expect(result.success).toBe(true);
  });
});
