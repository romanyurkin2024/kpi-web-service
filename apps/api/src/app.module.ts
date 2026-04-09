import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import * as Joi from 'joi';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AdminModule } from './admin/admin.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { externalPgConfigSchema } from './integrations/external-pg/external-pg.config';
import { oracleConfigSchema } from './integrations/oracle/oracle.config';
import { ScriptsModule } from './scripts/scripts.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        PORT: Joi.number().default(3000),
        DATABASE_URL: Joi.string().required(),
        JWT_ACCESS_SECRET: Joi.string().required(),
        JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
        JWT_REFRESH_SECRET: Joi.string().required(),
        JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
        FRONTEND_URL: Joi.string().default('http://localhost:3001'),
      })
        .concat(externalPgConfigSchema)
        .concat(oracleConfigSchema),
    }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 10,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100,
      },
    ]),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    AdminModule,
    IntegrationsModule,
    ScriptsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
