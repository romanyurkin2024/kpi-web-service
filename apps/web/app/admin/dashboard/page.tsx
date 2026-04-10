'use client';

import { useEffect, useState } from 'react';
import { Heading, Text, Grid, Card, Flex, Badge, Box } from '@radix-ui/themes';
import { api } from '@/lib/api';

interface IntegrationStatus {
  name: string;
  status: 'ok' | 'error' | 'disabled';
  message?: string;
}

interface SystemHealth {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  integrations: IntegrationStatus[];
}

const LABELS: Record<string, string> = {
  primary: 'Primary PostgreSQL',
  externalPg: 'Corporate PostgreSQL',
  oracle: 'Oracle DB',
};

const STATUS_COLOR: Record<string, 'green' | 'red' | 'gray'> = {
  ok: 'green',
  error: 'red',
  disabled: 'gray',
};

const STATUS_LABEL: Record<string, string> = {
  ok: 'Online',
  error: 'Error',
  disabled: 'Disabled',
};

export default function AdminDashboard() {
  const [health, setHealth] = useState<SystemHealth | null>(null);

  useEffect(() => {
    api.get<SystemHealth>('/admin/integrations/health')
      .then(({ data }) => setHealth(data))
      .catch(() => {});
  }, []);

  return (
    <Flex direction="column" gap="6">
      <Box>
        <Heading size="7">Dashboard</Heading>
        <Text color="gray" size="2">Welcome to KPI Platform admin panel</Text>
      </Box>

      <Grid columns="3" gap="4">
        {health
          ? health.integrations.map((integration) => (
              <Card key={integration.name}>
                <Flex direction="column" gap="2">
                  <Text size="2" color="gray">{LABELS[integration.name] ?? integration.name}</Text>
                  <Flex align="center" gap="2">
                    <Badge color={STATUS_COLOR[integration.status]}>
                      {STATUS_LABEL[integration.status]}
                    </Badge>
                  </Flex>
                  {integration.message && (
                    <Text size="1" color="red">{integration.message}</Text>
                  )}
                </Flex>
              </Card>
            ))
          : ['Primary DB', 'External PG', 'Oracle'].map((name) => (
              <Card key={name}>
                <Flex direction="column" gap="2">
                  <Text size="2" color="gray">{name}</Text>
                  <Text size="1" color="gray">Loading...</Text>
                </Flex>
              </Card>
            ))}
      </Grid>
    </Flex>
  );
}