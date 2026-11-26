import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import type { HealthResponse } from '@helpdesk/shared';
import { PrismaService } from '../prisma/prisma.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(): Promise<HealthResponse> {
    if (!(await this.prisma.isHealthy())) {
      throw new ServiceUnavailableException('Database is unavailable');
    }
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
