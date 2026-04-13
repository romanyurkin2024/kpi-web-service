import { Module } from '@nestjs/common';
import { ScriptsService } from './scripts.service';
import { ScriptsController } from './scripts.controller';
import { ExternalPgModule } from '../integrations/external-pg/external-pg.module';
import { OracleModule } from 'src/integrations/oracle/oracle.module';

@Module({
  imports: [ExternalPgModule, OracleModule],
  providers: [ScriptsService],
  controllers: [ScriptsController],
})
export class ScriptsModule {}
