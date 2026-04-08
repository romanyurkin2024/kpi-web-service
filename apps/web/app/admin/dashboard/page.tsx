'use client';

import { Heading, Text, Grid, Card, Flex, Badge, Box } from '@radix-ui/themes';

export default function AdminDashboard() {
  return (
    <Flex direction="column" gap="6">
      <Box>
        <Heading size="7">Dashboard</Heading>
        <Text color="gray" size="2">Welcome to KPI Platform admin panel</Text>
      </Box>

      <Grid columns="3" gap="4">
        <Card>
          <Flex direction="column" gap="2">
            <Text size="2" color="gray">Primary DB</Text>
            <Flex align="center" gap="2">
              <Badge color="green">Online</Badge>
              <Text size="2">PostgreSQL</Text>
            </Flex>
          </Flex>
        </Card>

        <Card>
          <Flex direction="column" gap="2">
            <Text size="2" color="gray">External PG</Text>
            <Flex align="center" gap="2">
              <Badge color="gray">Disabled</Badge>
              <Text size="2">PostgreSQL</Text>
            </Flex>
          </Flex>
        </Card>

        <Card>
          <Flex direction="column" gap="2">
            <Text size="2" color="gray">Oracle</Text>
            <Flex align="center" gap="2">
              <Badge color="gray">Disabled</Badge>
              <Text size="2">Oracle DB</Text>
            </Flex>
          </Flex>
        </Card>
      </Grid>
    </Flex>
  );
}
