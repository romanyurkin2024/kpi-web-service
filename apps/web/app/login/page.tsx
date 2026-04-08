'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Card, TextField, Button, Text, Heading, Flex } from '@radix-ui/themes';
import { login, getMe, isAdmin } from '@/lib/auth/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login({ email, password });
      const user = await getMe();

      if (isAdmin(user)) {
        router.push('/admin/dashboard');
      } else {
        router.push('/app/dashboard');
      }
    } catch {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Flex
      align="center"
      justify="center"
      style={{ minHeight: '100vh', background: 'var(--gray-2)' }}
    >
      <Card size="4" style={{ width: '100%', maxWidth: 400 }}>
        <Flex direction="column" gap="4">
          <Heading size="6" align="center">KPI Platform</Heading>
          <Text color="gray" align="center" size="2">
            Sign in to your account
          </Text>

          <form onSubmit={handleSubmit}>
            <Flex direction="column" gap="3">
              <Box>
                <Text as="label" size="2" weight="medium">
                  Email
                </Text>
                <TextField.Root
                  type="email"
                  placeholder="admin@kpi.local"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  mt="1"
                />
              </Box>

              <Box>
                <Text as="label" size="2" weight="medium">
                  Password
                </Text>
                <TextField.Root
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  mt="1"
                />
              </Box>

              {error && (
                <Text color="red" size="2">
                  {error}
                </Text>
              )}

              <Button type="submit" loading={loading} size="3">
                Sign in
              </Button>
            </Flex>
          </form>
        </Flex>
      </Card>
    </Flex>
  );
}
