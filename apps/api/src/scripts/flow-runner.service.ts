import { Injectable, Logger } from '@nestjs/common';
import { Subject } from 'rxjs';
import { ScriptsService } from './scripts.service';
import { AuditService } from '../audit/audit.service';

export interface FlowProgressEvent {
  event: 'progress' | 'complete' | 'error';
  flow?: string;
  func?: string;
  table?: string;
  status?: 'running' | 'success' | 'error' | 'skipped';
  message?: string;
  rowsInserted?: number;
  rowsDeleted?: number;
  results?: FlowRunResult[];
}

export interface FlowRunResult {
  flow: string;
  status: 'success' | 'partial' | 'error';
  results: {
    name_of_table: string;
    name_of_def_q: string;
    status: 'success' | 'error';
    message: string;
    rowsInserted?: number;
  }[];
}

interface FlowItem {
  name_of_table: string;
  name_of_def_q: string;
  connector: string;
  script: string | null;
  flow: string | null;
  base_ym: string | null;
  type_func: string | null;
  delete_script: string | null;
}

@Injectable()
export class FlowRunnerService {
  private readonly logger = new Logger(FlowRunnerService.name);
  private jobs = new Map<string, Subject<FlowProgressEvent>>();

  constructor(
    private readonly scriptsService: ScriptsService,
    private readonly auditService: AuditService,
  ) {}

  createJob(): { jobId: string; subject: Subject<FlowProgressEvent> } {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const subject = new Subject<FlowProgressEvent>();
    this.jobs.set(jobId, subject);
    return { jobId, subject };
  }

  getJob(jobId: string): Subject<FlowProgressEvent> | undefined {
    return this.jobs.get(jobId);
  }

  async runFlow(
    baseYm: string,
    dateValue: string,
    subject: Subject<FlowProgressEvent>,
    userEmail?: string,
    flowName?: string,
    funcName?: string,
  ): Promise<void> {
    try {
      const dateValues = await this.scriptsService.getDateValues(dateValue);

      const allItems =
        (await this.scriptsService.getDirectory()) as unknown as FlowItem[];

      let items = allItems.filter(
        (i) => i.flow && i.script && i.base_ym === baseYm,
      );

      if (flowName) items = items.filter((i) => i.flow === flowName);
      if (funcName) items = items.filter((i) => i.name_of_def_q === funcName);

      if (!items.length) {
        subject.next({ event: 'complete', results: [] });
        subject.complete();
        return;
      }

      const flowGroups = new Map<string, FlowItem[]>();
      for (const item of items) {
        const flow = item.flow!;
        if (!flowGroups.has(flow)) flowGroups.set(flow, []);
        flowGroups.get(flow)!.push(item);
      }

      const sortedFlows = [...flowGroups.keys()].sort();
      const allResults: FlowRunResult[] = [];

      for (const currentFlow of sortedFlows) {
        const flowItems = flowGroups.get(currentFlow)!;
        const flowResults: FlowRunResult['results'] = [];

        // Уведомляем что flow начался
        for (const item of flowItems) {
          subject.next({
            event: 'progress',
            flow: currentFlow,
            func: item.name_of_def_q,
            table: item.name_of_table,
            status: 'running',
          });
        }

        await Promise.all(
          flowItems.map(async (item) => {
            try {
              const result = await this.scriptsService.runScript({
                script: item.script!,
                targetTable: item.name_of_table,
                connector: item.connector,
                nameOfFunc: item.name_of_def_q,
                params: {
                  DATE_VALUE1: dateValues.date_value1,
                  DATE_VALUE3: dateValues.date_value3,
                },
                deleteScript:
                  item.type_func === 'old'
                    ? (item.delete_script ?? undefined)
                    : undefined,
                userEmail,
              });

              flowResults.push({
                name_of_table: item.name_of_table,
                name_of_def_q: item.name_of_def_q,
                status: 'success',
                message: result.message,
                rowsInserted: result.rowsAffected,
              });

              subject.next({
                event: 'progress',
                flow: currentFlow,
                func: item.name_of_def_q,
                table: item.name_of_table,
                status: 'success',
                message: result.message,
                rowsInserted: result.rowsAffected,
              });
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);

              flowResults.push({
                name_of_table: item.name_of_table,
                name_of_def_q: item.name_of_def_q,
                status: 'error',
                message,
              });

              subject.next({
                event: 'progress',
                flow: currentFlow,
                func: item.name_of_def_q,
                table: item.name_of_table,
                status: 'error',
                message,
              });
            }
          }),
        );

        const hasError = flowResults.some((r) => r.status === 'error');
        const allError = flowResults.every((r) => r.status === 'error');

        allResults.push({
          flow: currentFlow,
          status: allError ? 'error' : hasError ? 'partial' : 'success',
          results: flowResults,
        });
      }

      subject.next({ event: 'complete', results: allResults });
      subject.complete();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      subject.next({ event: 'error', message });
      subject.complete();
    } finally {
      setTimeout(() => this.jobs.delete(`job_${Date.now()}`), 60000);
    }
  }
}
