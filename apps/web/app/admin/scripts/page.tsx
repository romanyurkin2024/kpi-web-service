'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Heading, Text, Table, Badge, Button,
  Flex, Box, TextField, Dialog, TextArea,
  Select,
} from '@radix-ui/themes';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface Script {
  id: number;
  rpt_base_ymd: string;
  name_of_table: string;
  name_of_product: string;
  name_def: string;
  script: string;
  connector_use: string;
  comment: string | null;
  editor: string;
  fragment: string | null;
}

interface ScriptsResponse {
  data: Script[];
  total: number;
  limit: number;
  offset: number;
}

const CONNECTOR_COLORS: Record<string, 'blue' | 'orange' | 'gray'> = {
  'ORACLE': 'orange',
  'POSTGRE-DASHDB': 'blue',
};

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text.trim()).then(() => {
    toast.success('Скрипт скопирован в буфер обмена');
  });
}

export default function ScriptsPage() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const limit = 20;

  const fetchScripts = useCallback(async (currentOffset: number, query: string) => {
    setLoading(true);
    try {
      if (query.trim()) {
        const { data } = await api.get<Script[]>(`/admin/scripts/search?q=${encodeURIComponent(query)}`);
        setScripts(data);
        setTotal(data.length);
      } else {
        const { data } = await api.get<ScriptsResponse>(`/admin/scripts?limit=${limit}&offset=${currentOffset}`);
        setScripts(data.data);
        setTotal(data.total);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchScripts(offset, search), 300);
    return () => clearTimeout(timer);
  }, [search, offset, fetchScripts]);

  function handleCloseModal() {
    setSelectedScript(null);
    setEditMode(false);
  }

  return (
    <Flex direction="column" gap="5">
      <Flex justify="between" align="center">
        <Box>
          <Heading size="7">История скриптов</Heading>
          <Text color="gray" size="2">{total} записей в motiv.BI_SCRIPTS_CHRON</Text>
        </Box>
        <Button onClick={() => setShowAdd(true)}>+ Добавить скрипт</Button>
      </Flex>

      <TextField.Root
        placeholder="Поиск по таблице, продукту, функции, редактору..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
      />

      <Table.Root variant="surface">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell style={{ width: 60 }}>ID</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell style={{ width: 160 }}>Дата</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Таблица</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Продукт</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Функция</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell style={{ width: 140 }}>Коннектор</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Редактор</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Комментарий</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>SQL</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell></Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {loading ? (
            <Table.Row>
              <Table.Cell colSpan={10}>
                <Text color="gray">Загрузка...</Text>
              </Table.Cell>
            </Table.Row>
          ) : scripts.length === 0 ? (
            <Table.Row>
              <Table.Cell colSpan={10}>
                <Text color="gray">Данные не найдены</Text>
              </Table.Cell>
            </Table.Row>
          ) : scripts.map((script) => (
            <Table.Row key={script.id}>
              <Table.Cell>
                <Text size="1" color="gray">{script.id}</Text>
              </Table.Cell>
              <Table.Cell style={{ whiteSpace: 'nowrap' }}>
                <Text size="1">
                  {new Date(script.rpt_base_ymd).toLocaleString('ru-RU')}
                </Text>
              </Table.Cell>
              <Table.Cell>
                <Text size="2" weight="medium">{script.name_of_table}</Text>
              </Table.Cell>
              <Table.Cell>
                <Text size="2">{script.name_of_product}</Text>
              </Table.Cell>
              <Table.Cell>
                <Text size="2">{script.name_def}</Text>
              </Table.Cell>
              <Table.Cell>
                <Badge color={CONNECTOR_COLORS[script.connector_use] ?? 'gray'}>
                  {script.connector_use}
                </Badge>
              </Table.Cell>
              <Table.Cell>
                <Text size="2">{script.editor}</Text>
              </Table.Cell>
              <Table.Cell>
                <Text size="1" color="gray" style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                  {script.comment ?? '—'}
                </Text>
              </Table.Cell>
              <Table.Cell>
                <Box
                  title="Нажмите чтобы скопировать скрипт"
                  onClick={() => copyToClipboard(script.script ?? '')}
                  style={{
                    maxWidth: 200,
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
                  {(script.script ?? '').trim().slice(0, 60)}...                
                  </Box>
              </Table.Cell>
              <Table.Cell>
                <Button
                  size="1"
                  variant="outline"
                  onClick={() => { setSelectedScript(script); setEditMode(false); }}
                >
                  Просмотр
                </Button>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>

      {!search && (
        <Flex gap="2" justify="center">
          <Button variant="soft" disabled={offset === 0} onClick={() => setOffset((o) => Math.max(0, o - limit))}>
            Назад
          </Button>
          <Text size="2" style={{ lineHeight: '32px' }}>
            {offset + 1}–{Math.min(offset + limit, total)} из {total}
          </Text>
          <Button variant="soft" disabled={offset + limit >= total} onClick={() => setOffset((o) => o + limit)}>
            Вперёд
          </Button>
        </Flex>
      )}

      {/* Модал просмотра/редактирования */}
      <Dialog.Root open={!!selectedScript} onOpenChange={handleCloseModal}>
        <Dialog.Content aria-describedby={undefined} style={{ maxWidth: 700, maxHeight: '90vh', overflow: 'auto' }}>
          <Dialog.Title>
            {editMode ? `Редактирование скрипта #${selectedScript?.id}` : `Скрипт #${selectedScript?.id}`}
          </Dialog.Title>

          {selectedScript && (
            editMode
              ? <EditScriptForm
                  script={selectedScript}
                  onCancel={() => setEditMode(false)}
                  onSuccess={(updated) => {
                    setSelectedScript(updated);
                    setEditMode(false);
                    fetchScripts(offset, search);
                    toast.success('Скрипт обновлён');
                  }}
                />
              : <ViewScript
                  script={selectedScript}
                  onEdit={() => setEditMode(true)}
                  onClose={handleCloseModal}
                />
          )}
        </Dialog.Content>
      </Dialog.Root>

      {/* Модал добавления */}
      <AddScriptDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSuccess={() => {
          setShowAdd(false);
          fetchScripts(offset, search);
          toast.success('Скрипт добавлен');
        }}
      />
    </Flex>
  );
}

function ViewScript({
  script,
  onEdit,
  onClose,
}: {
  script: Script;
  onEdit: () => void;
  onClose: () => void;
}) {
  return (
    <Flex direction="column" gap="3">
      <Flex direction="column" gap="2">
        <Box>
          <Text size="1" color="gray">Таблица (name_of_table)</Text>
          <Text size="2" weight="medium" as="p">{script.name_of_table}</Text>
        </Box>
        <Box>
          <Text size="1" color="gray">Продукт (name_of_product)</Text>
          <Text size="2" as="p">{script.name_of_product || '—'}</Text>
        </Box>
        <Box>
          <Text size="1" color="gray">Функция (name_def)</Text>
          <Text size="2" as="p">{script.name_def}</Text>
        </Box>
        <Box>
          <Text size="1" color="gray">Коннектор</Text>
          <Box mt="1">
            <Badge color={CONNECTOR_COLORS[script.connector_use] ?? 'gray'}>
              {script.connector_use}
            </Badge>
          </Box>
        </Box>
        <Box>
          <Text size="1" color="gray">Редактор</Text>
          <Text size="2" as="p">{script.editor}</Text>
        </Box>
        <Box>
          <Text size="1" color="gray">Дата изменения</Text>
          <Text size="2" as="p">{new Date(script.rpt_base_ymd).toLocaleString('ru-RU')}</Text>
        </Box>
        {script.comment && (
          <Box>
            <Text size="1" color="gray">Комментарий</Text>
            <Text size="2" as="p">{script.comment}</Text>
          </Box>
        )}
        <Box>
          <Flex justify="between" align="center" mb="1">
            <Text size="1" color="gray">SQL скрипт</Text>
            <Button size="1" variant="ghost" onClick={() => copyToClipboard(script.script)}>
              Копировать
            </Button>
          </Flex>
          <Box
            p="3"
            style={{
              background: 'var(--gray-2)',
              borderRadius: 8,
              fontFamily: 'monospace',
              fontSize: 12,
              whiteSpace: 'pre-wrap',
              maxHeight: 350,
              overflow: 'auto',
            }}
          >
            {script.script.trim()}
          </Box>
        </Box>
      </Flex>

      <Flex gap="2" justify="end">
        <Button variant="soft" onClick={onEdit}>Редактировать</Button>
        <Dialog.Close>
          <Button variant="soft" color="gray" onClick={onClose}>Закрыть</Button>
        </Dialog.Close>
      </Flex>
    </Flex>
  );
}

function EditScriptForm({
  script,
  onCancel,
  onSuccess,
}: {
  script: Script;
  onCancel: () => void;
  onSuccess: (updated: Script) => void;
}) {
  const [form, setForm] = useState({
    name_of_table: script.name_of_table,
    name_of_product: script.name_of_product || '',
    name_def: script.name_def,
    script: script.script,
    connector_use: script.connector_use,
    comment: script.comment || '',
    editor: script.editor,
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const { data } = await api.patch<Script>(`/admin/scripts/${script.id}`, form);
      onSuccess(data);
    } catch {
      toast.error('Ошибка при обновлении скрипта');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Flex direction="column" gap="3">
      <Box>
        <Text size="2" weight="medium" as="p" mb="1">Таблица *</Text>
        <TextField.Root value={form.name_of_table} onChange={(e) => setForm({ ...form, name_of_table: e.target.value })} />
      </Box>
      <Box>
        <Text size="2" weight="medium" as="p" mb="1">Продукт</Text>
        <TextField.Root value={form.name_of_product} onChange={(e) => setForm({ ...form, name_of_product: e.target.value })} />
      </Box>
      <Box>
        <Text size="2" weight="medium" as="p" mb="1">Функция *</Text>
        <TextField.Root value={form.name_def} onChange={(e) => setForm({ ...form, name_def: e.target.value })} />
      </Box>
      <Box>
        <Text size="2" weight="medium" as="p" mb="1">Редактор *</Text>
        <TextField.Root value={form.editor} onChange={(e) => setForm({ ...form, editor: e.target.value })} />
      </Box>
      <Box>
        <Text size="2" weight="medium" as="p" mb="1">Коннектор</Text>
        <Select.Root value={form.connector_use} onValueChange={(v) => setForm({ ...form, connector_use: v })}>
          <Select.Trigger />
          <Select.Content>
            <Select.Item value="POSTGRE-DASHDB">POSTGRE-DASHDB</Select.Item>
            <Select.Item value="ORACLE">ORACLE</Select.Item>
          </Select.Content>
        </Select.Root>
      </Box>
      <Box>
        <Text size="2" weight="medium" as="p" mb="1">Комментарий к изменению</Text>
        <TextField.Root value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} placeholder="Причина изменения..." />
      </Box>
      <Box>
        <Text size="2" weight="medium" as="p" mb="1">SQL скрипт *</Text>
        <TextArea
          value={form.script}
          onChange={(e) => setForm({ ...form, script: e.target.value })}
          style={{ fontFamily: 'monospace', fontSize: 12, minHeight: 250 }}
        />
      </Box>

      <Flex gap="2" justify="end">
        <Button variant="soft" color="gray" onClick={onCancel}>Отмена</Button>
        <Button onClick={handleSave} loading={saving}>Сохранить</Button>
      </Flex>
    </Flex>
  );
}

function AddScriptDialog({
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
    name_of_product: '',
    name_def: '',
    script: '',
    connector_use: 'POSTGRE-DASHDB',
    comment: '',
    editor: '',
    fragment: '',
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!form.name_of_table || !form.name_def || !form.script || !form.editor) {
      toast.error('Заполните обязательные поля: Таблица, Функция, Скрипт, Редактор');
      return;
    }
    setSaving(true);
    try {
      await api.post('/admin/scripts', form);
      onSuccess();
      setForm({ name_of_table: '', name_of_product: '', name_def: '', script: '', connector_use: 'POSTGRE-DASHDB', comment: '', editor: '', fragment: '' });
    } catch {
      toast.error('Ошибка при добавлении скрипта');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Content aria-describedby={undefined} style={{ maxWidth: 700, maxHeight: '90vh', overflow: 'auto' }}>
        <Dialog.Title>Добавить скрипт</Dialog.Title>
        <Flex direction="column" gap="3">
          <Box>
            <Text size="2" weight="medium" as="p" mb="1">Таблица *</Text>
            <TextField.Root value={form.name_of_table} onChange={(e) => setForm({ ...form, name_of_table: e.target.value })} placeholder="name_of_table" />
          </Box>
          <Box>
            <Text size="2" weight="medium" as="p" mb="1">Продукт</Text>
            <TextField.Root value={form.name_of_product} onChange={(e) => setForm({ ...form, name_of_product: e.target.value })} placeholder="name_of_product" />
          </Box>
          <Box>
            <Text size="2" weight="medium" as="p" mb="1">Функция *</Text>
            <TextField.Root value={form.name_def} onChange={(e) => setForm({ ...form, name_def: e.target.value })} placeholder="name_def" />
          </Box>
          <Box>
            <Text size="2" weight="medium" as="p" mb="1">Редактор *</Text>
            <TextField.Root value={form.editor} onChange={(e) => setForm({ ...form, editor: e.target.value })} placeholder="tsoyroma" />
          </Box>
          <Box>
            <Text size="2" weight="medium" as="p" mb="1">Коннектор *</Text>
            <Select.Root value={form.connector_use} onValueChange={(v) => setForm({ ...form, connector_use: v })}>
              <Select.Trigger />
              <Select.Content>
                <Select.Item value="POSTGRE-DASHDB">POSTGRE-DASHDB</Select.Item>
                <Select.Item value="ORACLE">ORACLE</Select.Item>
              </Select.Content>
            </Select.Root>
          </Box>
          <Box>
            <Text size="2" weight="medium" as="p" mb="1">SQL скрипт *</Text>
            <TextArea
              value={form.script}
              onChange={(e) => setForm({ ...form, script: e.target.value })}
              placeholder="SELECT * FROM ..."
              style={{ fontFamily: 'monospace', fontSize: 12, minHeight: 200 }}
            />
          </Box>
          <Box>
            <Text size="2" weight="medium" as="p" mb="1">Комментарий</Text>
            <TextField.Root value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} placeholder="Причина добавления..." />
          </Box>
        </Flex>
        <Flex gap="2" mt="4" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray">Отмена</Button>
          </Dialog.Close>
          <Button onClick={handleSubmit} loading={saving}>Сохранить</Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}