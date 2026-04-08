import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AdminModule } from './admin/admin.module';
import { ExternalPgModule } from './integrations/external-pg/external-pg.module';
import { OracleModule } from './integrations/oracle/oracle.module';
import { externalPgConfigSchema } from './integrations/external-pg/external-pg.config';
import { oracleConfigSchema } from './integrations/oracle/oracle.config';

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
      })
        .concat(externalPgConfigSchema)
        .concat(oracleConfigSchema),
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    AdminModule,
    ExternalPgModule,
    OracleModule,
  ],
})
export class AppModule {}
