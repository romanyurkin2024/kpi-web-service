import {
  Injectable,
  Inject,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Pool, QueryResult } from 'pg';
import { EXTERNAL_PG_POOL } from '../integrations/external-pg/external-pg.provider';
import { ORACLE_POOL } from 'src/integrations/oracle/oracle.provider';
import { CreateScriptDto } from './dto/create-script.dto';
import { RunScriptDto } from './dto/run-scripts.dto';
import * as oracledb from 'oracledb';
import { AddToDirectoryDto } from './dto/add-to-directory.dto';
import { AuditService } from 'src/audit/audit.service';

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
    private readonly auditService: AuditService,
  ) {}

  private readonly logger = new Logger(ScriptsService.name);

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
    await this.auditService.log({
      actionType: 'script_add',
      entity: 'BI_SCRIPTS_CHRON',
      entityId: dto.name_of_table,
      description: `Добавлен скрипт для ${dto.name_def}`,
      completedAt: new Date(),
    });
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
      d.delete_script,
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
    this.logger.log(`=== runScript START ===`);
    this.logger.log(`connector: ${dto.connector}`);
    this.logger.log(`targetTable: ${dto.targetTable}`);
    this.logger.log(`nameOfFunc: ${dto.nameOfFunc}`);
    this.logger.log(`params: ${JSON.stringify(dto.params)}`);
    this.logger.log(
      `sql (first 200 chars): ${dto.script.trim().slice(0, 200)}`,
    );

    // Таблицы с регистрозависимыми именами (в кавычках)
    const QUOTED_TABLES = [
      'REAN_CLI_TABLE',
      'CLIENTS_OPER_DAYLI',
      'PAKETY_PREDZALIV',
    ];

    let sql = dto.script;
    for (const [key, value] of Object.entries(dto.params)) {
      sql = sql.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }

    const trimmed = sql
      .trim()
      .replace(/\/\*[\s\S]*?\*\//g, '') // убираем /* комментарии */
      .replace(/--.*$/gm, '') // убираем -- комментарии
      .trim()
      .toLowerCase();
    this.logger.log(`trimmed (first 100): ${trimmed.slice(0, 100)}`);
    if (!trimmed.startsWith('select') && !trimmed.startsWith('with')) {
      throw new BadRequestException('Only SELECT/WITH queries are allowed');
    }
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

        this.logger.log(`columns: ${columns.join(', ')}`);

        if (dto.targetTable === 'REAN_CLI_TABLE') {
          // Для old таблиц оставляем регистр как есть
          columns = result.metaData?.map((m) => m.name) ?? [];
          this.logger.log(`isQuoted rows returned: ${rows.length}`);
          this.logger.log(`isQuoted columns: ${columns.join(', ')}`);
        } else {
          // Для new таблиц приводим к нижнему регистру
          columns = result.metaData?.map((m) => m.name.toLowerCase()) ?? [];
          rows = rows.map((row) =>
            Object.fromEntries(
              Object.entries(row).map(([k, v]) => [k.toLowerCase(), v]),
            ),
          );
          this.logger.log(`rows returned: ${rows.length}`);
          this.logger.log(`columns: ${columns.join(', ')}`);
        }
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
      this.logger.log(`rows returned: ${rows.length}`);
      this.logger.log(`columns: ${columns.join(', ')}`);
    }

    if (rows.length) {
      const now = new Date();
      const rpt_base_ymd =
        now.getFullYear().toString() +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0') +
        String(now.getHours()).padStart(2, '0') +
        String(now.getMinutes()).padStart(2, '0') +
        String(now.getSeconds()).padStart(2, '0');
      rows = rows.map((row) => ({
        ...row,
        name_of_func: dto.nameOfFunc,
        rpt_base_ymd,
      }));
      columns = Object.keys(rows[0]);
    }

    if (!rows.length) {
      return {
        rowsAffected: 0,
        message: 'Скрипт выполнен, данных нет — заливка и удаление пропущены',
        preview: [],
      };
    }

    // Заливаем результат в витрину PostgreSQL
    const pgPool = this.getPgPool();

    const targetTable = QUOTED_TABLES.includes(dto.targetTable)
      ? `motiv."${dto.targetTable}"`
      : `motiv.${dto.targetTable}`;

    // Определяем дату для DELETE
    const scriptText = dto.script.toLowerCase();
    let dateValue = '';

    if (scriptText.includes('{date_value1}') && dto.params['DATE_VALUE1']) {
      dateValue = dto.params['DATE_VALUE1'];
    } else if (
      scriptText.includes('{date_value3}') &&
      dto.params['DATE_VALUE3']
    ) {
      dateValue = dto.params['DATE_VALUE3'];
    } else {
      dateValue = dto.params['DATE_VALUE1'] || dto.params['DATE_VALUE3'] || '';
    }

    this.logger.log(`dateValue for DELETE (from script): ${dateValue}`);

    // Проверяем существует ли витрина
    const existsResult = await pgPool.query<{ exists: boolean }>(
      `SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'motiv'
      AND table_name = $1
    ) as exists`,
      [dto.targetTable],
    );

    const tableExists = existsResult.rows[0].exists;
    this.logger.log(`tableExists: ${tableExists}`);
    this.logger.log(`dateValue for DELETE: ${dateValue}`);

    let deletedRows = 0;

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
    } else {
      if (dto.deleteScript) {
        // old функция — используем кастомный скрипт удаления
        let deleteSQL = dto.deleteScript;
        for (const [key, value] of Object.entries(dto.params)) {
          deleteSQL = deleteSQL.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
        }
        const deleteResult = await pgPool.query(deleteSQL);
        deletedRows = deleteResult.rowCount ?? 0;
        this.logger.log(`old function DELETE rows: ${deletedRows}`);
      } else if (dateValue) {
        const deleteSql = `DELETE FROM ${targetTable}
                            WHERE base_ymd <= $1
                            AND LEFT(base_ymd, 6) = LEFT($1, 6)
                            AND name_of_func = $2`;
        const deleteResult = await pgPool.query(deleteSql, [
          dateValue,
          dto.nameOfFunc,
        ]);
        deletedRows = deleteResult.rowCount ?? 0;
        this.logger.log(`new function DELETE rows: ${deletedRows}`);
      }
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

      const isQuoted = QUOTED_TABLES.includes(dto.targetTable);
      const colNames = columns
        .map((c) => (isQuoted ? `"${c}"` : `"${c}"`))
        .join(', ');
      await pgPool.query(
        `INSERT INTO ${targetTable} (${colNames}) VALUES ${placeholders}`,
        values,
      );
      inserted += batch.length;
    }

    this.logger.log(`inserted: ${inserted}`);
    this.logger.log(`=== runScript END ===`);

    await this.auditService.log({
      userEmail: dto.userEmail,
      actionType: 'script_run',
      entity: dto.targetTable,
      entityId: dto.nameOfFunc,
      connector: dto.connector,
      status: 'success',
      rowsDeleted: deletedRows,
      rowsInserted: inserted,
      params: dto.params,
      description: tableExists
        ? `Удалено ${deletedRows} строк, залито ${inserted} строк в ${targetTable}`
        : `Создана таблица ${targetTable} и залито ${inserted} строк`,
      completedAt: new Date(),
    });

    return {
      rowsAffected: inserted,
      message: tableExists
        ? `Удалено ${deletedRows} строк, залито ${inserted} строк в ${targetTable}`
        : `Создана таблица ${targetTable} и залито ${inserted} строк`,
      preview: rows.slice(0, 5),
    };
  }

  async addToDirectory(dto: AddToDirectoryDto): Promise<void> {
    const pool = this.getPgPool();
    await pool.query(
      `INSERT INTO motiv.ball_system_scripts_dct 
      (biznes, gruppa, prod, prod_type, connector, name_of_table, name_of_def_q, name_of_product, type_func, base_ym, rules, flow, delete_script)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        dto.biznes ?? null,
        dto.gruppa ?? null,
        dto.prod ?? null,
        dto.prod_type ?? null,
        dto.connector,
        dto.name_of_table,
        dto.name_of_def_q,
        dto.name_of_product ?? null,
        dto.type_func ?? null,
        dto.base_ym ?? null,
        dto.rules ?? null,
        dto.flow ?? null,
        dto.delete_script ?? null,
      ],
    );

    await this.auditService.log({
      userEmail: dto.userEmail,
      actionType: 'directory_add',
      entity: 'ball_system_scripts_dct',
      entityId: dto.name_of_table,
      description: `Добавлена функция ${dto.name_of_def_q} в справочник`,
      completedAt: new Date(),
    });
  }

  async update(id: number, dto: Partial<CreateScriptDto>): Promise<ScriptRow> {
    const pool = this.getPgPool();

    // Получаем старый скрипт для лога
    const existing = await this.findOne(id);
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
    await this.auditService.log({
      actionType: 'script_edit',
      entity: 'BI_SCRIPTS_CHRON',
      entityId: String(id),
      oldValue: existing?.script ?? undefined,
      newValue: dto.script ?? undefined,
      description: `Отредактирован скрипт #${id} (${existing?.name_def ?? ''}) редактором ${dto.editor ?? ''}`,
      completedAt: new Date(),
    });

    return result.rows[0];
  }

  async removeFromDirectory(
    nameOfTable: string,
    nameOfDefQ: string,
    userEmail?: string,
  ): Promise<void> {
    const pool = this.getPgPool();
    await pool.query(
      `DELETE FROM motiv.ball_system_scripts_dct 
       WHERE name_of_table = $1 AND name_of_def_q = $2`,
      [nameOfTable, nameOfDefQ],
    );
    await this.auditService.log({
      userEmail,
      actionType: 'directory_delete',
      entity: 'ball_system_scripts_dct',
      entityId: nameOfTable,
      description: `Удалена функция ${nameOfDefQ} из справочника`,
      completedAt: new Date(),
    });
  }

  async getDateValues(
    dateValue: string,
  ): Promise<{ date_value1: string; date_value3: string }> {
    const pool = this.getOraclePool();
    const conn = await pool.getConnection();

    try {
      const result = await conn.execute(
        `SELECT
        d.clnd_ymd as date_value1,
        to_char(least(sysdate, d.month_end_date), 'yyyymmdd') as date_value3
       FROM tsclcldarc d
       WHERE d.clnd_ymd = :dateValue`,
        { dateValue },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      const row = ((result.rows ?? []) as Record<string, string>[])[0];

      if (!row) {
        throw new BadRequestException(
          `No date values found for date ${dateValue}`,
        );
      }

      return {
        date_value1: row['DATE_VALUE1'],
        date_value3: row['DATE_VALUE3'],
      };
    } finally {
      await conn.close();
    }
  }
}
