import { Injectable, Inject, Logger } from '@nestjs/common';
import * as oracledb from 'oracledb';
import { ORACLE_POOL } from './oracle.provider';
import { IntegrationHealthResult } from '../integration.types';

@Injectable()
export class OracleHealthService {
  private readonly logger = new Logger(OracleHealthService.name);

  constructor(
    @Inject(ORACLE_POOL) private readonly pool: oracledb.Pool | null,
  ) {}

  async getStatus(): Promise<IntegrationHealthResult> {
    if (!this.pool) {
      return { name: 'oracle', status: 'disabled' };
    }

    try {
      const conn = await this.pool.getConnection();
      await conn.execute('SELECT 1 FROM DUAL');
      await conn.close();
      return { name: 'oracle', status: 'ok' };
    } catch (err) {
      this.logger.error('Oracle health check failed', err);
      return { name: 'oracle', status: 'error', message: 'Connection failed' };
    }
  }
}
