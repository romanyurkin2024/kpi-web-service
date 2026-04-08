'use client';

import { useEffect, useState } from 'react';
import { Heading, Text, Card, Flex, Box, Badge } from '@radix-ui/themes';
import { getMe, CurrentUser } from '@/lib/auth/auth';
import { api } from '@/lib/api';

interface Session {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
}

export default function UserDashboard() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    getMe().then(setUser);
    api.get<Session[]>('/users/me/sessions').then(({ data }) => setSessions(data));
  }, []);

  if (!user) return null;

  return (
    <Flex direction="column" gap="6">
      <Box>
        <Heading size="7">
          Welcome, {user.firstName ?? user.email}
        </Heading>
        <Text color="gray" size="2">Here is your account overview</Text>
      </Box>

      <Flex gap="4">
        <Card style={{ flex: 1 }}>
          <Flex direction="column" gap="2">
            <Text size="2" color="gray">Email</Text>
            <Text size="3" weight="medium">{user.email}</Text>
          </Flex>
        </Card>

        <Card style={{ flex: 1 }}>
          <Flex direction="column" gap="2">
            <Text size="2" color="gray">Role</Text>
            <Flex gap="2">
              {user.roles.map((r) => (
                <Badge key={r} color={r === 'ADMIN' ? 'blue' : 'gray'}>
                  {r}
                </Badge>
              ))}
            </Flex>
          </Flex>
        </Card>

        <Card style={{ flex: 1 }}>
          <Flex direction="column" gap="2">
            <Text size="2" color="gray">Status</Text>
            <Flex gap="2">
              <Badge color="green">Active</Badge>
            </Flex>
          </Flex>
        </Card>
      </Flex>

      <Box>
        <Heading size="4" mb="3">Active sessions</Heading>
        <Flex direction="column" gap="2">
          {sessions.length === 0 ? (
            <Text color="gray" size="2">No active sessions</Text>
          ) : sessions.map((session) => (
            <Card key={session.id}>
              <Flex justify="between" align="center">
                <Flex direction="column" gap="1">
                  <Text size="2" weight="medium">
                    {session.userAgent?.split(' ')[0] ?? 'Unknown browser'}
                  </Text>
                  <Text size="1" color="gray">
                    IP: {session.ipAddress ?? 'Unknown'} · Started: {new Date(session.createdAt).toLocaleString()}
                  </Text>
                </Flex>
                <Badge color="green" variant="soft">Active</Badge>
              </Flex>
            </Card>
          ))}
        </Flex>
      </Box>
    </Flex>
  );
}
