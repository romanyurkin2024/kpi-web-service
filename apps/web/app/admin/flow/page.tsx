'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Heading, Text, Button, Flex, Box,
  Card, Badge, Select, Spinner,
  TextField,
} from '@radix-ui/themes';
import { Play } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface FlowProgressEvent {
  event: 'progress' | 'complete' | 'error';
  flow?: string;
  func?: string;
  table?: string;
  status?: 'running' | 'success' | 'error';
  message?: string;
  rowsInserted?: number;
  results?: FlowResult[];
}

interface ProgressItem {
  status: 'running' | 'success' | 'error';
  message?: string;
  rowsInserted?: number;
  flow: string;
}

interface DirectoryItem {
  name_of_table: string;
  name_of_def_q: string;
  connector: string;
  flow: string | null;
  base_ym: string | null;
  script: string | null;
}

interface FuncResult {
  name_of_table: string;
  name_of_def_q: string;
  status: 'success' | 'error';
  message: string;
  rowsInserted?: number;
}

interface FlowResult {
  flow: string;
  status: 'success' | 'partial' | 'error';
  results: FuncResult[];
}

const STATUS_COLOR = {
  success: 'green',
  partial: 'orange',
  error: 'red',
} as const;

const STATUS_LABEL = {
  success: 'Успех',
  partial: 'Частично',
  error: 'Ошибка',
};

export default function FlowPage() {
  const [items, setItems] = useState<DirectoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningFuncs, setRunningFuncs] = useState<Set<string>>(new Set());   
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [results, setResults] = useState<FlowResult[] | null>(null);
  const [dateValue, setDateValue] = useState('');
  const [progress, setProgress] = useState<Map<string, ProgressItem>>(new Map());


  useEffect(() => {
    api.get<DirectoryItem[]>('/admin/scripts/directory')
      .then(({ data }) => setItems(data))
      .finally(() => setLoading(false));
  }, []);

  // Уникальные периоды у которых есть flow
  const periods = useMemo(() => {
    const set = new Set(
      items
        .filter((i) => i.flow && i.base_ym)
        .map((i) => i.base_ym!)
    );
    return [...set].sort().reverse();
  }, [items]);

  // Функции для выбранного периода сгруппированные по flow
  const flowGroups = useMemo(() => {
    if (selectedPeriod === 'all') return new Map<string, DirectoryItem[]>();
    const filtered = items.filter(
      (i) => i.flow && i.base_ym === selectedPeriod && i.script,
    );
    const groups = new Map<string, DirectoryItem[]>();
    for (const item of filtered) {
      const flow = item.flow!;
      if (!groups.has(flow)) groups.set(flow, []);
      groups.get(flow)!.push(item);
    }
    return new Map([...groups.entries()].sort());
  }, [items, selectedPeriod]);


    function isRunning(func?: string) {
        if (!func) return runningFuncs.size > 0;
        return runningFuncs.has(func);
    }

    function addRunning(funcs: string[]) {
        setRunningFuncs((prev) => new Set([...prev, ...funcs]));
    }

    function removeRunning(func: string) {
        setRunningFuncs((prev) => {
            const next = new Set(prev);
            next.delete(func);
            return next;
        });
    }

   async function startFlow(flowName?: string, funcName?: string) {
        if (selectedPeriod === 'all') {
            toast.error('Выберите период');
            return;
        }
        if (!dateValue || dateValue.length !== 8) {
            toast.error('Введите дату в формате yyyymmdd');
            return;
        }

         // Определяем какие функции запускаем
        let funcsToRun: string[] = [];
        if (funcName) {
            funcsToRun = [funcName];
        } else if (flowName) {
            funcsToRun = flowGroups.get(flowName)?.map((f) => f.name_of_def_q) ?? [];
        } else {
            funcsToRun = [...flowGroups.values()].flat().map((f) => f.name_of_def_q);
        }

        addRunning(funcsToRun);
        if (!funcName && !flowName) {
            setProgress(new Map());
            setResults(null);
        }

        try {
            const { data } = await api.post<{ jobId: string }>('/admin/scripts/flow/run', {
            baseYm: selectedPeriod,
            dateValue,
            flowName,
            funcName,
            });

            // Запускаем чтение стрима в фоне — не await
            void readStream(data.jobId, funcsToRun);

            } catch {
                toast.error('Ошибка при запуске flow');
                funcsToRun.forEach(removeRunning);
            }
        }

        async function readStream(jobId: string, funcsToRun: string[]) {
            const token = localStorage.getItem('accessToken');

            try {
                const response = await fetch(
                `http://localhost:3000/api/admin/scripts/flow/stream?jobId=${jobId}`,
                { headers: { Authorization: `Bearer ${token}` } },
                );

                const reader = response.body!.getReader();
                const decoder = new TextDecoder();

                while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter((l) => l.startsWith('data:'));

                for (const line of lines) {
                    const json = line.replace('data:', '').trim();
                    if (!json) continue;

                    try {
                        const event = JSON.parse(json) as FlowProgressEvent;

                        if (event.event === 'progress' && event.func) {
                            if (event.status === 'success' || event.status === 'error') {
                                removeRunning(event.func);
                            }
                            setProgress((prev) => {
                                const next = new Map(prev);
                                next.set(event.func!, {
                                    status: event.status!,
                                    message: event.message,
                                    rowsInserted: event.rowsInserted,
                                    flow: event.flow!,
                                });
                                return next;
                            });
                        }

                       if (event.event === 'complete') {
                        setResults((prev) => {
                            const existing = prev ?? [];
                            const newResults = event.results ?? [];
                            
                            const merged = [...existing];
                            for (const newFlow of newResults) {
                                const idx = merged.findIndex((r) => r.flow === newFlow.flow);
                                if (idx >= 0) {
                                    // Мержим результаты внутри flow — не заменяем весь объект
                                    const existingFuncs = merged[idx].results;
                                    const mergedFuncs = [...existingFuncs];
                                    
                                    for (const newFunc of newFlow.results) {
                                    const funcIdx = mergedFuncs.findIndex(
                                        (f) => f.name_of_def_q === newFunc.name_of_def_q
                                    );
                                    if (funcIdx >= 0) {
                                        mergedFuncs[funcIdx] = newFunc; // обновляем существующую функцию
                                    } else {
                                        mergedFuncs.push(newFunc); // добавляем новую
                                    }
                                    }
                                    
                                    // Определяем статус flow
                                    const hasError = mergedFuncs.some((f) => f.status === 'error');
                                    const allError = mergedFuncs.every((f) => f.status === 'error');
                                    
                                    merged[idx] = {
                                    ...merged[idx],
                                    results: mergedFuncs,
                                    status: allError ? 'error' : hasError ? 'partial' : 'success',
                                    };
                                } else {
                                    merged.push(newFlow);
                                }
                            }
                            return merged;
                        });
                        
                        funcsToRun.forEach(removeRunning);
                        const hasError = event.results?.some((r) => r.status !== 'success');
                        toast[hasError ? 'error' : 'success'](
                            hasError ? 'Flow завершён с ошибками' : 'Flow успешно завершён'
                        );
                        }

                        if (event.event === 'error') {
                            toast.error(event.message ?? 'Ошибка запуска');
                            funcsToRun.forEach(removeRunning);
                        }
                    } catch { /* ignore */ }
                }
                }
            } catch {
                toast.error('Ошибка стрима');
                funcsToRun.forEach(removeRunning);
            }
        }

    function handleRun() { return startFlow(); }
    function handleRunSingle(flow: string) { return startFlow(flow); }
    function handleRunFunc(flow: string, func: string) { return startFlow(flow, func); }

  return (
    <Flex direction="column" gap="5">
      <Box>
        <Heading size="7">Запуск flow</Heading>
        <Text color="gray" size="2">
          Последовательный запуск функций по порядку flow для выбранного периода
        </Text>
      </Box>

      <Card>
        <Flex gap="4" align="end">
          <Box style={{ flex: 1 }}>
            <Text size="2" weight="medium" as="p" mb="1">Период (base_ym)</Text>
            {loading ? (
              <Spinner size="1" />
            ) : (
              <>
                <Select.Root value={selectedPeriod} onValueChange={setSelectedPeriod}>
                    <Select.Trigger placeholder="Выберите период" />
                    <Select.Content>
                    <Select.Item value="all">Выберите период</Select.Item>
                    {periods.map((p) => (
                        <Select.Item key={p} value={p}>{p}</Select.Item>
                    ))}
                    </Select.Content>
                </Select.Root>
                <Box style={{ flex: 1 }}>
                <Text size="2" weight="medium" as="p" mb="1">Дата запуска (yyyymmdd)</Text>
                <TextField.Root
                    placeholder="20260415"
                    value={dateValue}
                    onChange={(e) => setDateValue(e.target.value)}
                    maxLength={8}
                />
                </Box>
              </>
            )}
          </Box>
          <Button
            size="3"
            onClick={handleRun}
            loading={isRunning()}
            disabled={selectedPeriod === 'all' || flowGroups.size === 0}
          >
            Запустить flow
          </Button>
        </Flex>
      </Card>

      {results && (
        <Flex direction="column" gap="3">
          <Text size="3" weight="medium">Результаты запуска</Text>
          {results.map((flowResult) => (
            <Card key={flowResult.flow}>
              <Flex justify="between" align="center" mb="3">
                <Text size="2" weight="medium">{flowResult.flow}</Text>
                <Badge color={STATUS_COLOR[flowResult.status]}>
                  {STATUS_LABEL[flowResult.status]}
                </Badge>
              </Flex>
              <Flex direction="column" gap="2">
                {flowResult.results.map((r) => (
                  <Flex
                    key={r.name_of_def_q}
                    justify="between"
                    align="center"
                    p="2"
                    style={{
                      borderRadius: 6,
                      background: r.status === 'error'
                        ? 'var(--red-2)'
                        : 'var(--green-2)',
                    }}
                  >
                    <Flex direction="column" gap="1">
                      <Text size="2" weight="medium">{r.name_of_def_q}</Text>
                      <Text size="1" color="gray">{r.name_of_table}</Text>
                    </Flex>
                    <Flex direction="column" align="end" gap="1">
                      <Badge color={r.status === 'success' ? 'green' : 'red'}>
                        {r.status === 'success' ? 'Успех' : 'Ошибка'}
                      </Badge>
                      <Text size="1" color="gray">{r.message}</Text>
                    </Flex>
                  </Flex>
                ))}
              </Flex>
            </Card>
          ))}
        </Flex>
      )}

      {/* Превью flow до запуска */}
      {selectedPeriod !== 'all' && flowGroups.size > 0 && (
        <Flex direction="column" gap="3">
          <Text size="3" weight="medium">
            План запуска — {flowGroups.size} flow, {[...flowGroups.values()].flat().length} функций
          </Text>
          {[...flowGroups.entries()].map(([flow, funcs]) => (
            <Card key={flow}>
              <Flex justify="between" align="center" mb="2">
                <Text size="2" weight="medium">{flow}</Text>
                <Flex gap="2" align="center">
                    <Badge color="gray">{funcs.length} функций · параллельно</Badge>
                    <Button
                    size="1"
                    variant="soft"
                    onClick={() => handleRunSingle(flow)}
                    disabled={isRunning()}
                    >
                    <Play size={12} /> Запустить
                    </Button>
                </Flex>
              </Flex>
              <Flex direction="column" gap="1">
                {funcs.map((f) => {
                    const prog = progress.get(f.name_of_def_q);
                    return (
                        <Flex key={f.name_of_def_q} justify="between" align="center" py="1"
                        style={{
                            borderRadius: 6,
                            padding: '6px 8px',
                            background: prog?.status === 'success' ? 'var(--green-2)'
                            : prog?.status === 'error' ? 'var(--red-2)'
                            : prog?.status === 'running' ? 'var(--blue-2)'
                            : 'transparent',
                            transition: 'background 0.3s',
                        }}
                        >
                        <Flex direction="column">
                            <Text size="2">{f.name_of_def_q}</Text>
                            <Text size="1" color="gray">{f.name_of_table}</Text>
                            {prog?.message && (
                            <Text size="1" color={prog.status === 'error' ? 'red' : 'gray'}>
                                {prog.message}
                            </Text>
                            )}
                        </Flex>
                        <Flex gap="2" align="center">
                            {prog?.status === 'running' && <Spinner size="1" />}
                            {prog?.status === 'success' && (<>
                                <Badge color="green">✓ {prog.rowsInserted} строк</Badge>
                                <Badge color={f.connector === 'ORACLE' ? 'orange' : 'blue'} size="1">
                                {f.connector}
                                </Badge>
                                <Button size="1" variant="ghost" onClick={() => handleRunFunc(f.flow!, f.name_of_def_q)} 
                                    disabled={isRunning(f.name_of_def_q)}
                                    loading={isRunning(f.name_of_def_q)}>
                                <Play size={12} />
                                </Button>
                            </>)
                            }
                            {prog?.status === 'error' && <Badge color="red">Ошибка</Badge> && (
                            <>
                                <Badge color={f.connector === 'ORACLE' ? 'orange' : 'blue'} size="1">
                                {f.connector}
                                </Badge>
                                <Button size="1" variant="ghost" onClick={() => handleRunFunc(f.flow!, f.name_of_def_q)} 
                                    disabled={isRunning(f.name_of_def_q)}
                                    loading={isRunning(f.name_of_def_q)}>
                                <Play size={12} />
                                </Button>
                            </>
                            )}
                            {!prog && (
                            <>
                                <Badge color={f.connector === 'ORACLE' ? 'orange' : 'blue'} size="1">
                                {f.connector}
                                </Badge>
                                <Button size="1" variant="ghost" onClick={() => handleRunFunc(f.flow!, f.name_of_def_q)} 
                                    disabled={isRunning(f.name_of_def_q)}
                                    loading={isRunning(f.name_of_def_q)}>
                                <Play size={12} />
                                </Button>
                            </>
                            )}
                        </Flex>
                        </Flex>
                    );
                    })}
              </Flex>
            </Card>
          ))}
        </Flex>
      )}

      {selectedPeriod !== 'all' && flowGroups.size === 0 && !loading && (
        <Card>
          <Text color="gray">Нет функций с flow для периода {selectedPeriod}</Text>
        </Card>
      )}

      {/* Результаты после запуска */}
      {isRunning() && (
        <Card>
          <Flex align="center" gap="3">
            <Spinner />
            <Text>Выполняется flow...</Text>
          </Flex>
        </Card>
      )}
    </Flex>
  );
}