import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { oracleConfig } from './oracle.config';
import { OracleProvider } from './oracle.provider';
import { OracleHealthService } from './oracle.health';

@Module({
  imports: [ConfigModule.forFeature(oracleConfig)],
  providers: [OracleProvider, OracleHealthService],
  exports: [OracleProvider, OracleHealthService],
})
export class OracleModule {}
