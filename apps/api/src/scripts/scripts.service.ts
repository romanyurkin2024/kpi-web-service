import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { Pool, QueryResult } from 'pg';
import { EXTERNAL_PG_POOL } from '../integrations/external-pg/external-pg.provider';
import { CreateScriptDto } from './dto/create-script.dto';

export interface ScriptRow {
  id: number;
  rpt_base_ymd: Date;
  name_of_table: string;
  name_of_product: string;
  name_def: string;
  script: string;
  connector_use: string;
  comment: string | null;
  editor: string;
  fragment: string | null;
}

export interface CountRow {
  total: string;
}

@Injectable()
export class ScriptsService {
  constructor(@Inject(EXTERNAL_PG_POOL) private readonly pool: Pool | null) {}

  private getPool(): Pool {
    if (!this.pool) {
      throw new BadRequestException('External PostgreSQL is disabled');
    }
    return this.pool;
  }

  async findAll(limit = 50, offset = 0) {
    const pool = this.getPool();

    const result: QueryResult<ScriptRow> = await pool.query(
      `SELECT 
        id, rpt_base_ymd, name_of_table, name_of_product,
        name_def, script, connector_use, comment, editor, fragment
       FROM motiv."BI_SCRIPTS_CHRON"
       ORDER BY rpt_base_ymd DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset],
    );

    const countResult: QueryResult<CountRow> = await pool.query(
      `SELECT COUNT(*)::text as total FROM motiv."BI_SCRIPTS_CHRON"`,
    );

    return {
      data: result.rows,
      total: parseInt(countResult.rows[0].total, 10),
      limit,
      offset,
    };
  }

  async findOne(id: number): Promise<ScriptRow | null> {
    const pool = this.getPool();
    const result: QueryResult<ScriptRow> = await pool.query(
      `SELECT * FROM motiv."BI_SCRIPTS_CHRON" WHERE id = $1`,
      [id],
    );
    return result.rows[0] ?? null;
  }

  async create(dto: CreateScriptDto): Promise<ScriptRow> {
    const pool = this.getPool();
    const result: QueryResult<ScriptRow> = await pool.query(
      `INSERT INTO motiv."BI_SCRIPTS_CHRON"
        (name_of_table, name_of_product, name_def, script, connector_use, comment, editor, fragment)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        dto.name_of_table,
        dto.name_of_product,
        dto.name_def,
        dto.script,
        dto.connector_use,
        dto.comment ?? null,
        dto.editor,
        dto.fragment ?? null,
      ],
    );
    return result.rows[0];
  }

  async search(query: string): Promise<ScriptRow[]> {
    const pool = this.getPool();
    const result: QueryResult<ScriptRow> = await pool.query(
      `SELECT 
        id, rpt_base_ymd, name_of_table, name_of_product,
        name_def, connector_use, comment, editor
       FROM motiv."BI_SCRIPTS_CHRON"
       WHERE
         name_of_table ILIKE $1 OR
         name_of_product ILIKE $1 OR
         name_def ILIKE $1 OR
         editor ILIKE $1
       ORDER BY rpt_base_ymd DESC
       LIMIT 100`,
      [`%${query}%`],
    );
    return result.rows;
  }

  async update(id: number, dto: Partial<CreateScriptDto>): Promise<ScriptRow> {
    const pool = this.getPool();
    const result: QueryResult<ScriptRow> = await pool.query(
      `UPDATE motiv."BI_SCRIPTS_CHRON"
     SET 
       name_of_table = COALESCE($1, name_of_table),
       name_of_product = COALESCE($2, name_of_product),
       name_def = COALESCE($3, name_def),
       script = COALESCE($4, script),
       connector_use = COALESCE($5, connector_use),
       comment = COALESCE($6, comment),
       editor = COALESCE($7, editor),
       rpt_base_ymd = NOW()
     WHERE id = $8
     RETURNING *`,
      [
        dto.name_of_table,
        dto.name_of_product,
        dto.name_def,
        dto.script,
        dto.connector_use,
        dto.comment,
        dto.editor,
        id,
      ],
    );
    return result.rows[0];
  }
}
