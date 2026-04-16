'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Heading, Text, Table, Badge, Button,
  Flex, Box, Select,
} from '@radix-ui/themes';
import { api } from '@/lib/api';

interface AuditLog {
  id: number;
  executed_at: string;
  completed_at: string | null;
  user_email: string | null;
  action_type: string;
  entity: string | null;
  entity_id: string | null;
  connector: string | null;
  status: string;
  rows_deleted: number;
  rows_inserted: number;
  error_message: string | null;
  description: string | null;
}

interface AuditResponse {
  data: AuditLog[];
  total: number;
}

const ACTION_LABELS: Record<string, string> = {
  script_run: 'Запуск скрипта',
  login: 'Вход',
  logout: 'Выход',
  login_failed: 'Неудачный вход',
  script_add: 'Добавление скрипта',
  script_edit: 'Редактирование скрипта',
  script_delete: 'Удаление скрипта',
  directory_add: 'Добавление в справочник',
  directory_delete: 'Удаление из справочника',
  user_role_change: 'Изменение роли',
  user_status_change: 'Изменение статуса',
};

const ACTION_COLORS: Record<string, 'green' | 'blue' | 'red' | 'orange' | 'gray'> = {
  script_run: 'blue',
  login: 'green',
  logout: 'gray',
  login_failed: 'red',
  script_add: 'green',
  script_edit: 'orange',
  script_delete: 'red',
  directory_add: 'green',
  directory_delete: 'red',
  user_role_change: 'orange',
  user_status_change: 'orange',
};

const LIMIT = 50;

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [actionFilter, setActionFilter] = useState('all');

  const fetchLogs = useCallback(async (currentOffset: number, action: string) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        limit: String(LIMIT),
        offset: String(currentOffset),
      };
      if (action !== 'all') params.actionType = action;

      const { data } = await api.get<AuditResponse>('/admin/audit', { params });
      setLogs(data.data);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(offset, actionFilter);
  }, [offset, actionFilter, fetchLogs]);

  return (
    <Flex direction="column" gap="5">
      <Box>
        <Heading size="7">Журнал действий</Heading>
        <Text color="gray" size="2">{total} записей · motiv.kpi_audit_log</Text>
      </Box>

      <Flex gap="3">
        <Select.Root
          value={actionFilter}
          onValueChange={(v) => { setActionFilter(v); setOffset(0); }}
        >
          <Select.Trigger />
          <Select.Content>
            <Select.Item value="all">Все действия</Select.Item>
            {Object.entries(ACTION_LABELS).map(([key, label]) => (
              <Select.Item key={key} value={key}>{label}</Select.Item>
            ))}
          </Select.Content>
        </Select.Root>

        <Button variant="soft" onClick={() => fetchLogs(offset, actionFilter)}>
          Обновить
        </Button>
      </Flex>

      <Table.Root variant="surface">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell style={{ width: 160 }}>Дата</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Пользователь</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Действие</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Объект</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Коннектор</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Статус</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Строк удалено</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Строк залито</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Описание</Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {loading ? (
            <Table.Row>
              <Table.Cell colSpan={9}>
                <Text color="gray">Загрузка...</Text>
              </Table.Cell>
            </Table.Row>
          ) : logs.length === 0 ? (
            <Table.Row>
              <Table.Cell colSpan={9}>
                <Text color="gray">Записей нет</Text>
              </Table.Cell>
            </Table.Row>
          ) : logs.map((log) => (
            <Table.Row key={log.id}>
              <Table.Cell style={{ whiteSpace: 'nowrap' }}>
                <Text size="1">
                  {new Date(log.executed_at).toLocaleString('ru-RU')}
                </Text>
              </Table.Cell>
              <Table.Cell>
                <Text size="2">{log.user_email ?? '—'}</Text>
              </Table.Cell>
              <Table.Cell>
                <Badge color={ACTION_COLORS[log.action_type] ?? 'gray'}>
                  {ACTION_LABELS[log.action_type] ?? log.action_type}
                </Badge>
              </Table.Cell>
              <Table.Cell>
                <Flex direction="column">
                  <Text size="2">{log.entity ?? '—'}</Text>
                  {log.entity_id && (
                    <Text size="1" color="gray">{log.entity_id}</Text>
                  )}
                </Flex>
              </Table.Cell>
              <Table.Cell>
                {log.connector ? (
                  <Badge color={log.connector === 'ORACLE' ? 'orange' : 'blue'}>
                    {log.connector}
                  </Badge>
                ) : <Text color="gray" size="1">—</Text>}
              </Table.Cell>
              <Table.Cell>
                <Badge color={log.status === 'success' ? 'green' : 'red'}>
                  {log.status === 'success' ? 'Успех' : 'Ошибка'}
                </Badge>
              </Table.Cell>
              <Table.Cell>
                <Text size="2">{log.rows_deleted > 0 ? log.rows_deleted : '—'}</Text>
              </Table.Cell>
              <Table.Cell>
                <Text size="2">{log.rows_inserted > 0 ? log.rows_inserted : '—'}</Text>
              </Table.Cell>
              <Table.Cell>
                <Text size="1" color="gray" style={{
                  maxWidth: 250,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  display: 'block',
                }}>
                  {log.error_message ?? log.description ?? '—'}
                </Text>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>

      {total > LIMIT && (
        <Flex gap="2" justify="center">
          <Button
            variant="soft"
            disabled={offset === 0}
            onClick={() => setOffset((o) => Math.max(0, o - LIMIT))}
          >
            Назад
          </Button>
          <Text size="2" style={{ lineHeight: '32px' }}>
            {offset + 1}–{Math.min(offset + LIMIT, total)} из {total}
          </Text>
          <Button
            variant="soft"
            disabled={offset + LIMIT >= total}
            onClick={() => setOffset((o) => o + LIMIT)}
          >
            Вперёд
          </Button>
        </Flex>
      )}
    </Flex>
  );
}