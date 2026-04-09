import { Module } from '@nestjs/common';
import { ScriptsService } from './scripts.service';
import { ScriptsController } from './scripts.controller';
import { ExternalPgModule } from '../integrations/external-pg/external-pg.module';

@Module({
  imports: [ExternalPgModule],
  providers: [ScriptsService],
  controllers: [ScriptsController],
})
export class ScriptsModule {}
