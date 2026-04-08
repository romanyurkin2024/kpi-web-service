import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';

export const externalPgConfigSchema = Joi.object({
  EXT_PG_ENABLED: Joi.boolean().default(false),
  EXT_PG_HOST: Joi.string().allow('').optional(),
  EXT_PG_PORT: Joi.number().allow('').optional().default(5432),
  EXT_PG_USER: Joi.string().allow('').optional(),
  EXT_PG_PASSWORD: Joi.string().allow('').optional(),
  EXT_PG_DATABASE: Joi.string().allow('').optional(),
});

export const externalPgConfig = registerAs('externalPg', () => ({
  enabled: process.env.EXT_PG_ENABLED === 'true',
  host: process.env.EXT_PG_HOST,
  port: parseInt(process.env.EXT_PG_PORT ?? '5432', 10),
  user: process.env.EXT_PG_USER,
  password: process.env.EXT_PG_PASSWORD,
  database: process.env.EXT_PG_DATABASE,
}));
