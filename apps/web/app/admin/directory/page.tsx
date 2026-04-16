'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Heading, Text, Table, Badge, Button,
  Flex, Box, TextField, Dialog, Card,
  Spinner,
  Select,
  TextArea,
} from '@radix-ui/themes';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface DirectoryItem {
  biznes: string | null;
  gruppa: string | null;
  prod: string | null;
  prod_type: string | null;
  prof: string | null;
  rules: string | null;
  connector: string;
  name_of_table: string;
  name_of_def_q: string;
  name_of_product: string | null;
  type_func: string | null;
  base_ym: string | null;
  script: string | null;
  rpt_base_ymd: string | null;
  editor: string | null;
  comment: string | null;
}

interface RunResult {
  rowsAffected: number;
  message: string;
  preview: Record<string, unknown>[];
}

const CONNECTOR_COLORS: Record<string, 'blue' | 'orange' | 'gray'> = {
  'ORACLE': 'orange',
  'POSTGRE-DASHDB': 'blue',
};

function extractPlaceholders(script: string): string[] {
  const matches = script.match(/\{([^}]+)\}/g) ?? [];
  return [...new Set(matches.map((m) => m.slice(1, -1)))];
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text.trim()).then(() => {
    toast.success('Скрипт скопирован');
  });
}

const PAGE_SIZE = 20;

export default function DirectoryPage() {
  const [items, setItems] = useState<DirectoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<DirectoryItem | null>(null);
  const [periodFilter, setPeriodFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    api.get<DirectoryItem[]>('/admin/scripts/directory')
      .then(({ data }) => setItems(data))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(item: DirectoryItem) {
    if (!confirm(`Удалить функцию ${item.name_of_def_q} из справочника?`)) return;
    try {
      await api.delete(`/admin/scripts/directory?table=${item.name_of_table}&func=${item.name_of_def_q}`);
      toast.success('Функция удалена из справочника');
      // Обновляем список
      setItems((prev) => prev.filter(
        (i) => !(i.name_of_table === item.name_of_table && i.name_of_def_q === item.name_of_def_q)
      ));
    } catch {
      toast.error('Ошибка при удалении');
    }
  }

  const filtered = useMemo(() => {
    let result = items;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((i) =>
        i.name_of_table?.toLowerCase().includes(q) ||
        i.name_of_def_q?.toLowerCase().includes(q) ||
        i.gruppa?.toLowerCase().includes(q) ||
        i.prod?.toLowerCase().includes(q) ||
        i.connector?.toLowerCase().includes(q) ||
        i.rules?.toLowerCase().includes(q) ||
        i.base_ym?.toLowerCase().includes(q),
      );
    }

    if (periodFilter !== 'all') {
      result = result.filter((i) => i.base_ym === periodFilter);
    }

    return result;
  }, [search, items, periodFilter]);

  const periods = useMemo(() => {
    const set = new Set(
      items
        .map((i) => i.base_ym)
        .filter((p): p is string => !!p)
    );
    return [...set].sort().reverse();
  }, [items]);

  const paginated = useMemo(() => {
    return filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  }, [filtered, page]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  return (
    <Flex direction="column" gap="5">
      <Flex justify="between" align="center">
          <Box>
            <Heading size="7">Справочник скриптов</Heading>
            <Text color="gray" size="2">
              {filtered.length} из {items.length} записей · motiv.ball_system_scripts_dct
            </Text>
          </Box>
          <Button onClick={() => setShowAdd(true)}>+ Добавить в справочник</Button>
      </Flex>
      <Flex gap="3">
        <TextField.Root
          placeholder="Поиск по таблице, функции, группе, продукту..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          style={{ flex: 1 }}
        />
        <Select.Root
          value={periodFilter}
          onValueChange={(v) => { setPeriodFilter(v); setPage(0); }}
        >
          <Select.Trigger placeholder="Все периоды" />
          <Select.Content>
            <Select.Item value="all">Все периоды</Select.Item>
            {periods.map((p) => (
              <Select.Item key={p} value={p}>{p}</Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      </Flex>
      

      <Table.Root variant="surface">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>Таблица</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Функция</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Группа</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Продукт</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Правила</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Период</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Коннектор</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Обновлён</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>SQL</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell></Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {loading ? (
            <Table.Row>
              <Table.Cell colSpan={10}>
                <Flex align="center" gap="2">
                  <Spinner size="1" />
                  <Text color="gray">Загрузка...</Text>
                </Flex>
              </Table.Cell>
            </Table.Row>
          ) : paginated.length === 0 ? (
            <Table.Row>
              <Table.Cell colSpan={10}>
                <Text color="gray">Данные не найдены</Text>
              </Table.Cell>
            </Table.Row>
          ) : paginated.map((item, idx) => (
            <Table.Row key={idx}>
              <Table.Cell>
                <Text size="2" weight="medium">{item.name_of_table}</Text>
              </Table.Cell>
              <Table.Cell>
                <Text size="2">{item.name_of_def_q}</Text>
              </Table.Cell>
              <Table.Cell>
                <Text size="2" color="gray">{item.gruppa ?? '—'}</Text>
              </Table.Cell>
              <Table.Cell>
                <Text size="2" color="gray">{item.name_of_product ?? '—'}</Text>
              </Table.Cell>
              <Table.Cell>
                <Text size="1" color="gray" style={{
                  maxWidth: 150,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  display: 'block',
                }}>
                  {item.rules ?? '—'}
                </Text>
              </Table.Cell>
              <Table.Cell>
                <Text size="1" color="gray">{item.base_ym ?? '—'}</Text>
              </Table.Cell>
              <Table.Cell>
                <Badge color={CONNECTOR_COLORS[item.connector] ?? 'gray'}>
                  {item.connector}
                </Badge>
              </Table.Cell>
              <Table.Cell style={{ whiteSpace: 'nowrap' }}>
                <Text size="1" color="gray">
                  {item.rpt_base_ymd
                    ? new Date(item.rpt_base_ymd).toLocaleString('ru-RU')
                    : '—'}
                </Text>
              </Table.Cell>
              <Table.Cell>
                {item.script ? (
                  <Box
                    title="Нажмите чтобы скопировать"
                    onClick={() => copyToClipboard(item.script!)}
                    style={{
                      maxWidth: 180,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      fontFamily: 'monospace',
                      fontSize: 11,
                      color: 'var(--accent-9)',
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: 'var(--accent-2)',
                    }}
                  >
                    {item.script.trim().slice(0, 50)}...
                  </Box>
                ) : (
                  <Text size="1" color="gray">нет скрипта</Text>
                )}
              </Table.Cell>
              <Table.Cell>
                <Flex gap="2">
                <Button
                  size="1"
                  variant="solid"
                  disabled={!item.script}
                  onClick={() => setSelected(item)}
                >
                  Запустить
                </Button>
                <Button
                  size="1"
                  variant="soft"
                  color="red"
                  onClick={() => handleDelete(item)}
                >
                  Удалить
                </Button>
                </Flex>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>

      {totalPages > 1 && (
        <Flex gap="2" justify="center" align="center">
          <Button
            variant="soft"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            Назад
          </Button>
          <Text size="2">
            Страница {page + 1} из {totalPages} · {filtered.length} записей
          </Text>
          <Button
            variant="soft"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Вперёд
          </Button>
        </Flex>
      )}

      {selected && (
        <RunScriptDialog
          item={selected}
          onClose={() => setSelected(null)}
        />
      )}
  
      {showAdd && (
        <AddToDirectoryDialog
          open={showAdd}
          onClose={() => setShowAdd(false)}
          onSuccess={() => {
            setShowAdd(false);
            toast.success('Добавлено в справочник');
            // Перезагружаем данные
            setLoading(true);
            api.get<DirectoryItem[]>('/admin/scripts/directory')
              .then(({ data }) => setItems(data))
              .finally(() => setLoading(false));
          }}
        />
      )}

    </Flex>
  );
}

function RunScriptDialog({
  item,
  onClose,
}: {
  item: DirectoryItem;
  onClose: () => void;
}) {
  const placeholders = extractPlaceholders(item.script ?? '');
  const [params, setParams] = useState<Record<string, string>>(
    Object.fromEntries(placeholders.map((p) => [p, ''])),
  );
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);


  async function handleRun() {
    for (const key of placeholders) {
      if (!params[key]?.trim()) {
        toast.error(`Заполните параметр ${key}`);
        return;
      }
    }

    setRunning(true);
    setResult(null);

    try {
      const { data } = await api.post<RunResult>('/admin/scripts/run', {
        script: item.script,
        targetTable: item.name_of_table,
        connector: item.connector,
        nameOfFunc: item.name_of_def_q,
        params,
      });
      setResult(data);
      toast.success(data.message);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })
        ?.response?.data?.message ?? 'Ошибка выполнения скрипта';
      toast.error(msg);
    } finally {
      setRunning(false);
    }
  }

  const resultColumns = result?.preview?.length
    ? Object.keys(result.preview[0])
    : [];

  return (
    <Dialog.Root open onOpenChange={onClose}>
      <Dialog.Content
        aria-describedby={undefined}
        style={{ maxWidth: 900, maxHeight: '90vh', overflow: 'auto' }}
      >
        <Dialog.Title>Запуск · {item.name_of_table}</Dialog.Title>

        <Flex direction="column" gap="4">
          <Flex gap="4" wrap="wrap">
            <Box>
              <Text size="1" color="gray">Функция</Text>
              <Text size="2" weight="medium" as="p">{item.name_of_def_q}</Text>
            </Box>
            <Box>
              <Text size="1" color="gray">Коннектор</Text>
              <Box mt="1">
                <Badge color={CONNECTOR_COLORS[item.connector] ?? 'gray'}>
                  {item.connector}
                </Badge>
              </Box>
            </Box>
            {item.rules && (
              <Box>
                <Text size="1" color="gray">Правила</Text>
                <Text size="2" as="p">{item.rules}</Text>
              </Box>
            )}
            {item.base_ym && (
              <Box>
                <Text size="1" color="gray">Период</Text>
                <Text size="2" as="p">{item.base_ym}</Text>
              </Box>
            )}
          </Flex>

          {placeholders.length > 0 && (
            <Card>
              <Text size="2" weight="medium" as="p" mb="3">Параметры</Text>
              <Flex direction="column" gap="3">
                {placeholders.map((placeholder) => (
                  <Box key={placeholder}>
                    <Text size="2" as="p" mb="1">
                      <Text weight="medium">{`{${placeholder}}`}</Text>
                      <Text color="gray" size="1"> · формат: YYYYMMDD</Text>
                    </Text>
                    <TextField.Root
                      placeholder="например: 20260410"
                      value={params[placeholder] ?? ''}
                      onChange={(e) =>
                        setParams({ ...params, [placeholder]: e.target.value })
                      }
                    />
                  </Box>
                ))}
              </Flex>
            </Card>
          )}

          <Box>
            <Flex justify="between" align="center" mb="1">
              <Text size="1" color="gray">SQL скрипт</Text>
              <Button size="1" variant="ghost" onClick={() => copyToClipboard(item.script ?? '')}>
                Копировать
              </Button>
            </Flex>
            <Box
              p="3"
              style={{
                background: 'var(--gray-2)',
                borderRadius: 8,
                fontFamily: 'monospace',
                fontSize: 11,
                whiteSpace: 'pre-wrap',
                maxHeight: 200,
                overflow: 'auto',
              }}
            >
              {item.script?.trim()}
            </Box>
          </Box>

          {result && (
            <Card>
              <Text size="2" weight="medium" as="p" mb="2">
                Результат — {result.rowsAffected} строк
              </Text>
              {result.preview.length > 0 && (
                <Box style={{ overflowX: 'auto' }}>
                  <Table.Root variant="surface" size="1">
                    <Table.Header>
                      <Table.Row>
                        {resultColumns.map((col) => (
                          <Table.ColumnHeaderCell key={col}>
                            <Text size="1">{col}</Text>
                          </Table.ColumnHeaderCell>
                        ))}
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {result.preview.map((row, i) => (
                        <Table.Row key={i}>
                          {resultColumns.map((col) => (
                            <Table.Cell key={col}>
                              <Text size="1">
                                {row[col] === null || row[col] === undefined
                                  ? '—'
                                  : String(row[col])}
                              </Text>
                            </Table.Cell>
                          ))}
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Root>
                  {result.rowsAffected > 5 && (
                    <Text size="1" color="gray" mt="2" as="p">
                      Показаны первые 5 из {result.rowsAffected} строк
                    </Text>
                  )}
                </Box>
              )}
            </Card>
          )}
        </Flex>

        <Flex gap="2" mt="4" justify="end">
          <Button variant="soft" color="gray" onClick={onClose} disabled={running}>
            Закрыть
          </Button>
          <Button onClick={handleRun} loading={running}>
            Запустить
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

function AddToDirectoryDialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    name_of_table: '',
    name_of_def_q: '',
    name_of_product: '',
    connector: 'POSTGRE-DASHDB',
    biznes: '',
    gruppa: '',
    prod: '',
    prod_type: '',
    type_func: '',
    base_ym: '',
    rules: '',
    flow: '',
    delete_script: '',
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!form.name_of_table || !form.name_of_def_q || !form.connector) {
      toast.error('Заполните обязательные поля: Таблица, Функция, Коннектор');
      return;
    }
    setSaving(true);
    try {
      await api.post('/admin/scripts/directory', form);
      onSuccess();
      setForm({
        name_of_table: '', name_of_def_q: '', name_of_product: '',
        connector: 'POSTGRE-DASHDB', biznes: '', gruppa: '', prod: '',
        prod_type: '', type_func: '', base_ym: '', rules: '', flow: '', delete_script: '',
      });
    } catch {
      toast.error('Ошибка при добавлении');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Content aria-describedby={undefined} style={{ maxWidth: 600 }}>
        <Dialog.Title>Добавить в справочник</Dialog.Title>
        <Flex direction="column" gap="3">
          <Flex gap="3">
            <Box style={{ flex: 1 }}>
              <Text size="2" weight="medium" as="p" mb="1">Таблица *</Text>
              <TextField.Root
                value={form.name_of_table}
                onChange={(e) => setForm({ ...form, name_of_table: e.target.value })}
                placeholder="name_of_table"
              />
            </Box>
            <Box style={{ flex: 1 }}>
              <Text size="2" weight="medium" as="p" mb="1">Функция *</Text>
              <TextField.Root
                value={form.name_of_def_q}
                onChange={(e) => setForm({ ...form, name_of_def_q: e.target.value })}
                placeholder="name_of_def_q"
              />
            </Box>
          </Flex>

          <Flex gap="3">
            <Box style={{ flex: 1 }}>
              <Text size="2" weight="medium" as="p" mb="1">Продукт</Text>
              <TextField.Root
                value={form.name_of_product}
                onChange={(e) => setForm({ ...form, name_of_product: e.target.value })}
                placeholder="name_of_product"
              />
            </Box>
            <Box style={{ flex: 1 }}>
              <Text size="2" weight="medium" as="p" mb="1">Коннектор *</Text>
              <Select.Root
                value={form.connector}
                onValueChange={(v) => setForm({ ...form, connector: v })}
              >
                <Select.Trigger />
                <Select.Content>
                  <Select.Item value="POSTGRE-DASHDB">POSTGRE-DASHDB</Select.Item>
                  <Select.Item value="ORACLE">ORACLE</Select.Item>
                </Select.Content>
              </Select.Root>
            </Box>
          </Flex>

          <Flex gap="3">
            <Box style={{ flex: 1 }}>
              <Text size="2" weight="medium" as="p" mb="1">Бизнес</Text>
              <TextField.Root
                value={form.biznes}
                onChange={(e) => setForm({ ...form, biznes: e.target.value })}
                placeholder="biznes"
              />
            </Box>
            <Box style={{ flex: 1 }}>
              <Text size="2" weight="medium" as="p" mb="1">Группа</Text>
              <TextField.Root
                value={form.gruppa}
                onChange={(e) => setForm({ ...form, gruppa: e.target.value })}
                placeholder="gruppa"
              />
            </Box>
          </Flex>

          <Flex gap="3">
            <Box style={{ flex: 1 }}>
              <Text size="2" weight="medium" as="p" mb="1">Продукт (prod)</Text>
              <TextField.Root
                value={form.prod}
                onChange={(e) => setForm({ ...form, prod: e.target.value })}
                placeholder="prod"
              />
            </Box>
            <Box style={{ flex: 1 }}>
              <Text size="2" weight="medium" as="p" mb="1">Тип продукта</Text>
              <TextField.Root
                value={form.prod_type}
                onChange={(e) => setForm({ ...form, prod_type: e.target.value })}
                placeholder="prod_type"
              />
            </Box>
          </Flex>

          <Flex gap="3">
            <Box style={{ flex: 1 }}>
              <Text size="2" weight="medium" as="p" mb="1">Период (base_ym)</Text>
              <TextField.Root
                value={form.base_ym}
                onChange={(e) => setForm({ ...form, base_ym: e.target.value })}
                placeholder="202604"
              />
            </Box>
            <Box style={{ flex: 1 }}>
              <Text size="2" weight="medium" as="p" mb="1">Онлайн-обновление:</Text>
              <TextField.Root
                value={form.rules}
                onChange={(e) => setForm({ ...form, rules: e.target.value })}
                placeholder="1"
              />
            </Box>
          </Flex>
          <Flex gap="3">
            <Box>
              <Text size="2" weight="medium" as="p" mb="1">Тип функции</Text>
              <Select.Root
                value={form.type_func || 'new'}
                onValueChange={(v) => setForm({ ...form, type_func: v })}
              >
                <Select.Trigger />
                <Select.Content>
                  <Select.Item value="new">new</Select.Item>
                  <Select.Item value="old">old</Select.Item>
                </Select.Content>
              </Select.Root>
            </Box>
              {form.type_func === 'old' && (
                <Box>
                  <Text size="2" weight="medium" as="p" mb="1">Скрипт удаления</Text>
                  <TextArea
                    value={form.delete_script}
                    onChange={(e) => setForm({ ...form, delete_script: e.target.value })}
                    placeholder="DELETE FROM motiv.TABLE WHERE ..."
                    style={{ fontFamily: 'monospace', fontSize: 12, minHeight: 100 }}
                  />
                </Box>
              )}
            <Box style={{ flex: 1 }}>
              <Text size="2" weight="medium" as="p" mb="1">Flow</Text>
              <TextField.Root
                value={form.flow}
                onChange={(e) => setForm({ ...form, flow: e.target.value })}
                placeholder="flow"
              />
            </Box>
          </Flex>
        </Flex>

        <Flex gap="2" mt="4" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray">Отмена</Button>
          </Dialog.Close>
          <Button onClick={handleSubmit} loading={saving}>
            Сохранить
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
