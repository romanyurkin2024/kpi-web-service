import { Provider, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

export const EXTERNAL_PG_POOL = 'EXTERNAL_PG_POOL';

export const ExternalPgProvider: Provider = {
  provide: EXTERNAL_PG_POOL,
  inject: [ConfigService],
  useFactory: async (config: ConfigService) => {
    const logger = new Logger('ExternalPgProvider');
    const enabled = config.get<boolean>('externalPg.enabled');

    if (!enabled) {
      logger.log('External PostgreSQL integration is disabled');
      return null;
    }

    const pool = new Pool({
      host: config.get('externalPg.host'),
      port: config.get('externalPg.port'),
      user: config.get('externalPg.user'),
      password: config.get('externalPg.password'),
      database: config.get('externalPg.database'),
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    try {
      await pool.query('SELECT 1');
      logger.log('External PostgreSQL connected successfully');
    } catch (err) {
      logger.error('External PostgreSQL connection failed', err);
    }

    return pool;
  },
};
