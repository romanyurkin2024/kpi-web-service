'use client';

import { useEffect, useState } from 'react';
import { Heading, Text, Card, Flex, Box, Badge, Button } from '@radix-ui/themes';
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

const integrationLabels: Record<string, string> = {
  primary: 'Primary PostgreSQL',
  externalPg: 'Corporate PostgreSQL',
  oracle: 'Oracle DB',
};

const statusColor: Record<string, 'green' | 'red' | 'gray'> = {
  ok: 'green',
  error: 'red',
  disabled: 'gray',
};

export default function IntegrationsPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchHealth() {
    try {
      const { data } = await api.get<SystemHealth>('/admin/integrations/health');
      setHealth(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchHealth();
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    await fetchHealth();
  }

  if (loading) return <Text color="gray">Loading...</Text>;

  return (
    <Flex direction="column" gap="6">
      <Flex justify="between" align="center">
        <Box>
          <Heading size="7">Integrations</Heading>
          <Text color="gray" size="2">
            Last checked: {health ? new Date(health.timestamp).toLocaleString() : '—'}
          </Text>
        </Box>
        <Button variant="soft" onClick={handleRefresh} loading={refreshing}>
          Refresh
        </Button>
      </Flex>

      <Card>
        <Flex align="center" gap="3" mb="4">
          <Text size="2" weight="medium">System status:</Text>
          <Badge color={health?.status === 'ok' ? 'green' : 'red'} size="2">
            {health?.status.toUpperCase()}
          </Badge>
        </Flex>

        <Flex direction="column" gap="3">
          {health?.integrations.map((integration) => (
            <Flex
              key={integration.name}
              justify="between"
              align="center"
              p="3"
              style={{
                borderRadius: 8,
                background: 'var(--gray-2)',
              }}
            >
              <Flex direction="column" gap="1">
                <Text size="2" weight="medium">
                  {integrationLabels[integration.name] ?? integration.name}
                </Text>
                {integration.message && (
                  <Text size="1" color="red">{integration.message}</Text>
                )}
              </Flex>
              <Badge color={statusColor[integration.status]}>
                {integration.status.toUpperCase()}
              </Badge>
            </Flex>
          ))}
        </Flex>
      </Card>
    </Flex>
  );
}
