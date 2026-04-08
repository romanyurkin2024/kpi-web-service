export interface IntegrationHealthResult {
  name: string;
  status: 'ok' | 'error' | 'disabled';
  message?: string;
}

export interface SystemHealthResult {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  integrations: IntegrationHealthResult[];
}
