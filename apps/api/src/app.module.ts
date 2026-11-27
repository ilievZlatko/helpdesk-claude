import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { createAuth } from './auth/auth.js';
import { validateEnv, type Env } from './config/env.js';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { PrismaService } from './prisma/prisma.service.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
    // Mounts better-auth on /api/auth/* and registers a global AuthGuard:
    // routes require a session unless marked @AllowAnonymous().
    AuthModule.forRootAsync({
      inject: [PrismaService, ConfigService],
      useFactory: (
        prisma: PrismaService,
        config: ConfigService<Env, true>,
      ) => ({
        auth: createAuth(prisma, {
          BETTER_AUTH_SECRET: config.get('BETTER_AUTH_SECRET', { infer: true }),
          BETTER_AUTH_URL: config.get('BETTER_AUTH_URL', { infer: true }),
          WEB_ORIGIN: config.get('WEB_ORIGIN', { infer: true }),
        }),
      }),
    }),
    HealthModule,
    UsersModule,
  ],
})
export class AppModule {}
