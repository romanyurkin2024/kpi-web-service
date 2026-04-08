import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';

export const oracleConfigSchema = Joi.object({
  ORACLE_ENABLED: Joi.boolean().default(false),
  ORACLE_HOST: Joi.string().allow('').optional(),
  ORACLE_PORT: Joi.alternatives()
    .try(Joi.number(), Joi.string().allow(''))
    .optional()
    .default(1521),
  ORACLE_USER: Joi.string().allow('').optional(),
  ORACLE_PASSWORD: Joi.string().allow('').optional(),
  ORACLE_SERVICE_NAME: Joi.string().allow('').optional(),
});

export const oracleConfig = registerAs('oracle', () => ({
  enabled: process.env.ORACLE_ENABLED === 'true',
  host: process.env.ORACLE_HOST,
  port: parseInt(process.env.ORACLE_PORT ?? '1521', 10),
  user: process.env.ORACLE_USER,
  password: process.env.ORACLE_PASSWORD,
  serviceName: process.env.ORACLE_SERVICE_NAME,
}));
