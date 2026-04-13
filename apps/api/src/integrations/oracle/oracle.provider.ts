import { Provider, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as oracledb from 'oracledb';

export const ORACLE_POOL = 'ORACLE_POOL';

export const OracleProvider: Provider = {
  provide: ORACLE_POOL,
  inject: [ConfigService],
  useFactory: async (config: ConfigService) => {
    const logger = new Logger('OracleProvider');
    const enabled = config.get<boolean>('ORACLE_ENABLED');

    if (!enabled) {
      logger.log('Oracle integration is disabled');
      return null;
    }

    try {
      oracledb.initOracleClient();
    } catch {
      logger.warn('Oracle thick mode not available, using thin mode');
    }

    try {
      const pool = await oracledb.createPool({
        user: config.get('ORACLE_USER'),
        password: config.get('ORACLE_PASSWORD'),
        connectString: `${config.get('ORACLE_HOST')}:${config.get('ORACLE_PORT')}/${config.get('ORACLE_SERVICE_NAME')}`,
        poolMin: 1,
        poolMax: 10,
        poolIncrement: 1,
      });

      const conn = await pool.getConnection();
      await conn.execute('SELECT 1 FROM DUAL');
      await conn.close();

      logger.log('Oracle connected successfully');
      return pool;
    } catch (err) {
      logger.error('Oracle connection failed', err);
      return null;
    }
  },
};
