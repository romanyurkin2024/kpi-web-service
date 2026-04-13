import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { EXTERNAL_PG_POOL } from '../integrations/external-pg/external-pg.provider';

export type ActionType =
  | 'script_run'
  | 'login'
  | 'logout'
  | 'login_failed'
  | 'script_add'
  | 'script_edit'
  | 'script_delete'
  | 'directory_add'
  | 'directory_delete'
  | 'user_role_change'
  | 'user_status_change';

export interface AuditLogDto {
  userEmail?: string;
  actionType: ActionType;
  entity?: string;
  entityId?: string;
  connector?: string;
  status?: 'success' | 'error';
  rowsDeleted?: number;
  rowsInserted?: number;
  errorMessage?: string;
  oldValue?: string;
  newValue?: string;
  params?: Record<string, unknown>;
  description?: string;
  completedAt?: Date;
}

@Injectable()
export class AuditService {
  constructor(@Inject(EXTERNAL_PG_POOL) private readonly pool: Pool | null) {}

  async log(dto: AuditLogDto): Promise<void> {
    if (!this.pool) return; // если коннект выключен — молча пропускаем

    try {
      await this.pool.query(
        `INSERT INTO motiv.kpi_audit_log 
          (user_email, action_type, entity, entity_id, connector, status,
           rows_deleted, rows_inserted, error_message, old_value, new_value,
           params, description, completed_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [
          dto.userEmail ?? null,
          dto.actionType,
          dto.entity ?? null,
          dto.entityId ?? null,
          dto.connector ?? null,
          dto.status ?? 'success',
          dto.rowsDeleted ?? 0,
          dto.rowsInserted ?? 0,
          dto.errorMessage ?? null,
          dto.oldValue ?? null,
          dto.newValue ?? null,
          dto.params ? JSON.stringify(dto.params) : null,
          dto.description ?? null,
          dto.completedAt ?? new Date(),
        ],
      );
    } catch (err) {
      console.error('AuditLog failed:', err);
    }
  }

  async getLogs(limit = 50, offset = 0, actionType?: string) {
    if (!this.pool) return { data: [], total: 0 };

    const where = actionType ? `WHERE action_type = $3` : '';
    const params: (number | string)[] = [limit, offset];
    if (actionType) params.push(actionType);

    const result = await this.pool.query(
      `SELECT * FROM motiv.kpi_audit_log
       ${where}
       ORDER BY executed_at DESC
       LIMIT $1 OFFSET $2`,
      params,
    );

    const countResult: { rows: { total: string }[] } = await this.pool.query(
      `SELECT COUNT(*)::text as total FROM motiv.kpi_audit_log ${where}`,
      actionType ? [actionType] : [],
    );

    return {
      data: result.rows,
      total: parseInt(countResult.rows[0].total, 10),
      limit,
      offset,
    };
  }
}
