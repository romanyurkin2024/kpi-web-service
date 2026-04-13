import { Module, Global } from '@nestjs/common';
import { AuditService } from './audit.service';
import { ExternalPgModule } from '../integrations/external-pg/external-pg.module';

import { AuditController } from './audit.controller';

@Global()
@Module({
  imports: [ExternalPgModule],
  providers: [AuditService],
  controllers: [AuditController],
  exports: [AuditService],
})
export class AuditModule {}
