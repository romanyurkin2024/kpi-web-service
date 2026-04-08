import { Module } from '@nestjs/common';
import { ExternalPgModule } from './external-pg/external-pg.module';
import { OracleModule } from './oracle/oracle.module';
import { IntegrationHealthService } from './integration-health.service';
import { IntegrationsController } from './integrations.controller';

@Module({
  imports: [ExternalPgModule, OracleModule],
  providers: [IntegrationHealthService],
  controllers: [IntegrationsController],
})
export class IntegrationsModule {}
