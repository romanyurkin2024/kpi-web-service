import { Injectable, Inject, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import { EXTERNAL_PG_POOL } from './external-pg.provider';
import { IntegrationHealthResult } from '../integration.types';

@Injectable()
export class ExternalPgHealthService {
  private readonly logger = new Logger(ExternalPgHealthService.name);

  constructor(
    @Inject(EXTERNAL_PG_POOL) private readonly pool: Pool | null,
  ) {}

  async getStatus(): Promise<IntegrationHealthResult> {
    if (!this.pool) {
      return { name: 'externalPg', status: 'disabled' };
    }

    try {
      await this.pool.query('SELECT 1');
      return { name: 'externalPg', status: 'ok' };
    } catch (err) {
      this.logger.error('External PG health check failed', err);
      return { name: 'externalPg', status: 'error', message: 'Connection failed' };
    }
  }
}
