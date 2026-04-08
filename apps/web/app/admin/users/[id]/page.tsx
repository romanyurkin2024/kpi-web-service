'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Heading, Text, Card, Flex, Box,
  Badge, Button, Select,
} from '@radix-ui/themes';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  isActive: boolean;
  roles: string[];
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');

  async function fetchUser() {
    try {
      const { data } = await api.get<User>(`/admin/users/${id}`);
      setUser(data);
      setSelectedRole(data.roles[0] ?? 'USER');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUser();
  }, [id]);

  async function handleRoleUpdate() {
    setSaving(true);
    try {
      await api.patch(`/admin/users/${id}/role`, { role: selectedRole });
      toast.success('Role updated successfully');
      await fetchUser();
    } catch {
      toast.error('Failed to update role');
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusToggle() {
    if (!user) return;
    setSaving(true);
    try {
      await api.patch(`/admin/users/${id}/status`, { isActive: !user.isActive });
      toast.success(user.isActive ? 'User deactivated' : 'User activated');
      await fetchUser();
    } catch {
      toast.error('Failed to update status');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Text color="gray">Loading...</Text>;
  if (!user) return <Text color="red">User not found</Text>;

  return (
    <Flex direction="column" gap="6">
      <Flex align="center" gap="3">
        <Button variant="ghost" onClick={() => router.push('/admin/users')}>
          ← Back
        </Button>
        <Heading size="7">User Details</Heading>
      </Flex>

      <Flex gap="4" wrap="wrap">
        <Card style={{ flex: 1, minWidth: 280 }}>
          <Heading size="3" mb="4">Account info</Heading>
          <Flex direction="column" gap="3">
            <Box>
              <Text size="1" color="gray">Email</Text>
              <Text size="2" weight="medium" as="p">{user.email}</Text>
            </Box>
            <Box>
              <Text size="1" color="gray">Name</Text>
              <Text size="2" weight="medium" as="p">
                {user.firstName || user.lastName
                  ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
                  : '—'}
              </Text>
            </Box>
            <Box>
              <Text size="1" color="gray">Status</Text>
              <Badge color={user.isActive ? 'green' : 'red'} mt="1">
                {user.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </Box>
            <Box>
              <Text size="1" color="gray">Created</Text>
              <Text size="2" as="p">
                {new Date(user.createdAt).toLocaleString()}
              </Text>
            </Box>
            <Box>
              <Text size="1" color="gray">Last login</Text>
              <Text size="2" as="p">
                {user.lastLoginAt
                  ? new Date(user.lastLoginAt).toLocaleString()
                  : 'Never'}
              </Text>
            </Box>
          </Flex>
        </Card>

        <Flex direction="column" gap="4" style={{ flex: 1, minWidth: 280 }}>
          <Card>
            <Heading size="3" mb="4">Role management</Heading>
            <Flex direction="column" gap="3">
              <Box>
                <Text size="2" color="gray" mb="2" as="p">Current role</Text>
                {user.roles.map((r) => (
                  <Badge key={r} color={r === 'ADMIN' ? 'blue' : 'gray'}>
                    {r}
                  </Badge>
                ))}
              </Box>
              <Box>
                <Text size="2" color="gray" mb="2" as="p">Change role</Text>
                <Flex gap="2">
                  <Select.Root value={selectedRole} onValueChange={setSelectedRole}>
                    <Select.Trigger />
                    <Select.Content>
                      <Select.Item value="ADMIN">Admin</Select.Item>
                      <Select.Item value="USER">User</Select.Item>
                    </Select.Content>
                  </Select.Root>
                  <Button onClick={handleRoleUpdate} loading={saving}>
                    Save
                  </Button>
                </Flex>
              </Box>
            </Flex>
          </Card>

          <Card>
            <Heading size="3" mb="4">Account status</Heading>
            <Flex direction="column" gap="3">
              <Text size="2" color="gray">
                {user.isActive
                  ? 'User can log in and access the platform.'
                  : 'User is deactivated and cannot log in.'}
              </Text>
              <Button
                color={user.isActive ? 'red' : 'green'}
                variant="soft"
                onClick={handleStatusToggle}
                loading={saving}
              >
                {user.isActive ? 'Deactivate user' : 'Activate user'}
              </Button>
            </Flex>
          </Card>
        </Flex>
      </Flex>
    </Flex>
  );
}
