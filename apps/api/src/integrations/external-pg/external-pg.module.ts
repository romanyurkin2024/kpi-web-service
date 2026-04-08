import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { externalPgConfig } from './external-pg.config';
import { ExternalPgProvider } from './external-pg.provider';
import { ExternalPgHealthService } from './external-pg.health';

@Module({
  imports: [ConfigModule.forFeature(externalPgConfig)],
  providers: [ExternalPgProvider, ExternalPgHealthService],
  exports: [ExternalPgProvider, ExternalPgHealthService],
})
export class ExternalPgModule {}
