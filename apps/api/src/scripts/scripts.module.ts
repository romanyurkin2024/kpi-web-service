import { Module } from '@nestjs/common';
import { ScriptsService } from './scripts.service';
import { ScriptsController } from './scripts.controller';
import { ExternalPgModule } from '../integrations/external-pg/external-pg.module';
import { OracleModule } from 'src/integrations/oracle/oracle.module';
import { FlowRunnerService } from './flow-runner.service';

@Module({
  imports: [ExternalPgModule, OracleModule],
  providers: [ScriptsService, FlowRunnerService],
  controllers: [ScriptsController],
})
export class ScriptsModule {}
