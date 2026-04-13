import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { Pool, QueryResult } from 'pg';
import { EXTERNAL_PG_POOL } from '../integrations/external-pg/external-pg.provider';
import { ORACLE_POOL } from 'src/integrations/oracle/oracle.provider';
import { CreateScriptDto } from './dto/create-script.dto';
import { RunScriptDto } from './dto/run-scripts.dto';
import * as oracledb from 'oracledb';

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
  constructor(
    @Inject(EXTERNAL_PG_POOL) private readonly pgPool: Pool | null,
    @Inject(ORACLE_POOL) private readonly oraclePool: oracledb.Pool | null,
  ) {}

  private getPgPool(): Pool {
    if (!this.pgPool) {
      throw new BadRequestException('External PostgreSQL is disabled');
    }
    return this.pgPool;
  }

  private getOraclePool(): oracledb.Pool {
    if (!this.oraclePool) {
      throw new BadRequestException('Oracle is disabled');
    }
    return this.oraclePool;
  }

  async findAll(limit = 50, offset = 0) {
    const pool = this.getPgPool();

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
    const pool = this.getPgPool();
    const result: QueryResult<ScriptRow> = await pool.query(
      `SELECT * FROM motiv."BI_SCRIPTS_CHRON" WHERE id = $1`,
      [id],
    );
    return result.rows[0] ?? null;
  }

  async create(dto: CreateScriptDto): Promise<ScriptRow> {
    const pool = this.getPgPool();
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
    const pool = this.getPgPool();
    const result: QueryResult<ScriptRow> = await pool.query(
      `SELECT 
        id, rpt_base_ymd, name_of_table, name_of_product,
        name_def, script, connector_use, comment, editor
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

  async getDirectory() {
    const pool = this.getPgPool();
    const result: QueryResult<Record<string, unknown>> = await pool.query(`
    SELECT 
      d.biznes,
      d.gruppa,
      d.prod,
      d.prod_type,
      d.prof,
      d.rules,
      d.connector,
      d.name_of_table,
      d.name_of_def_q,
      d.creator,
      d.base_ym,
      d.flow,
      d.name_of_product,
      d.type_func,
      h.script,
      h.rpt_base_ymd,
      h.editor,
      h.comment
    FROM motiv.ball_system_scripts_dct d
    LEFT JOIN LATERAL (
      SELECT script, rpt_base_ymd, editor, comment
      FROM motiv."BI_SCRIPTS_CHRON" c
      WHERE c.name_of_table = d.name_of_table
        AND c.name_def = d.name_of_def_q
      ORDER BY c.rpt_base_ymd DESC
      LIMIT 1
    ) h ON true
    ORDER BY d.base_ym DESC
  `);
    return result.rows;
  }

  async runScript(dto: RunScriptDto) {
    // Подставляем плейсхолдеры
    let sql = dto.script;
    for (const [key, value] of Object.entries(dto.params)) {
      sql = sql.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }

    const trimmed = sql.trim().toLowerCase();
    if (!trimmed.startsWith('select') && !trimmed.startsWith('with')) {
      throw new BadRequestException('Only SELECT/WITH queries are allowed');
    }

    // Выполняем на нужном коннекторе
    let rows: Record<string, unknown>[];
    let columns: string[];

    if (dto.connector === 'ORACLE') {
      const pool = this.getOraclePool();
      const conn = await pool.getConnection();
      try {
        const result = await conn.execute(sql, [], {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
          fetchArraySize: 1000,
        });
        rows = (result.rows ?? []) as Record<string, unknown>[];
        columns = result.metaData?.map((m) => m.name.toLowerCase()) ?? [];
        // Oracle возвращает ключи в верхнем регистре — приводим к нижнему
        rows = rows.map((row) =>
          Object.fromEntries(
            Object.entries(row).map(([k, v]) => [k.toLowerCase(), v]),
          ),
        );
      } finally {
        await conn.close();
      }
    } else {
      // PostgreSQL
      const pool = this.getPgPool();
      const result: QueryResult<Record<string, unknown>> =
        await pool.query(sql);
      rows = result.rows;
      columns = rows.length ? Object.keys(rows[0]) : [];
    }

    if (!rows.length) {
      return {
        rowsAffected: 0,
        message: 'Скрипт выполнен, данных нет',
        preview: [],
      };
    }

    // Заливаем результат в витрину PostgreSQL
    const pgPool = this.getPgPool();
    const targetTable = `motiv.${dto.targetTable}`;

    const existsResult = await pgPool.query<{ exists: boolean }>(
      `SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'motiv'
      AND table_name = $1
    ) as exists`,
      [dto.targetTable],
    );

    const tableExists = existsResult.rows[0].exists;

    if (!tableExists) {
      const columnDefs = columns
        .map((col) => {
          const val = rows[0][col];
          let pgType = 'TEXT';
          if (typeof val === 'number')
            pgType = Number.isInteger(val) ? 'BIGINT' : 'NUMERIC';
          if (typeof val === 'boolean') pgType = 'BOOLEAN';
          if (val instanceof Date) pgType = 'TIMESTAMP';
          return `"${col}" ${pgType}`;
        })
        .join(', ');

      await pgPool.query(`CREATE TABLE ${targetTable} (${columnDefs})`);
    }

    const BATCH = 1000;
    let inserted = 0;

    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      const placeholders = batch
        .map(
          (_, rowIdx) =>
            `(${columns.map((_, colIdx) => `$${rowIdx * columns.length + colIdx + 1}`).join(', ')})`,
        )
        .join(', ');

      const values = batch.flatMap((row) =>
        columns.map((col) => {
          const val = row[col];
          if (val === null || val === undefined) return null;
          if (typeof val === 'object' && !(val instanceof Date))
            return JSON.stringify(val);
          return val;
        }),
      );

      const colNames = columns.map((c) => `"${c}"`).join(', ');
      await pgPool.query(
        `INSERT INTO ${targetTable} (${colNames}) VALUES ${placeholders}`,
        values,
      );
      inserted += batch.length;
    }

    return {
      rowsAffected: inserted,
      message: tableExists
        ? `Залито ${inserted} строк в ${targetTable}`
        : `Создана таблица ${targetTable} и залито ${inserted} строк`,
      preview: rows.slice(0, 5),
    };
  }

  async update(id: number, dto: Partial<CreateScriptDto>): Promise<ScriptRow> {
    const pool = this.getPgPool();
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

  async removeFromDirectory(
    nameOfTable: string,
    nameOfDefQ: string,
  ): Promise<void> {
    const pool = this.getPgPool();
    await pool.query(
      `DELETE FROM motiv.ball_system_scripts_dct 
       WHERE name_of_table = $1 AND name_of_def_q = $2`,
      [nameOfTable, nameOfDefQ],
    );
  }
}
