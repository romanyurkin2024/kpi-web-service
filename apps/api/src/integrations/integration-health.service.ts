import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExternalPgHealthService } from './external-pg/external-pg.health';
import { OracleHealthService } from './oracle/oracle.health';
import { SystemHealthResult } from './integration.types';

@Injectable()
export class IntegrationHealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly externalPgHealth: ExternalPgHealthService,
    private readonly oracleHealth: OracleHealthService,
  ) {}

  async getSystemHealth(): Promise<SystemHealthResult> {
    const [primaryStatus, externalPgStatus, oracleStatus] = await Promise.all([
      this.checkPrimary(),
      this.externalPgHealth.getStatus(),
      this.oracleHealth.getStatus(),
    ]);

    const integrations = [primaryStatus, externalPgStatus, oracleStatus];
    const hasError = integrations.some((i) => i.status === 'error');

    return {
      status: hasError ? 'degraded' : 'ok',
      timestamp: new Date().toISOString(),
      integrations,
    };
  }

  private async checkPrimary() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { name: 'primary', status: 'ok' as const };
    } catch {
      return { name: 'primary', status: 'error' as const, message: 'Connection failed' };
    }
  }
}
