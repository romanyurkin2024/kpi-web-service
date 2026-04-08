'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Heading, Text, Table, Badge, Button,
  Flex, Box, TextField, Select,
} from '@radix-ui/themes';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  isActive: boolean;
  roles: string[];
  createdAt: string;
  lastLoginAt: string | null;
}

interface UsersResponse {
  data: User[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);

  const fetchUsers = useCallback(async (page: number, role: string) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(page),
        limit: '20',
      };
      if (role !== 'all') params.role = role;

      const { data } = await api.get<UsersResponse>('/admin/users', { params });
      setUsers(data.data);
      setMeta(data.meta);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(currentPage, roleFilter);
  }, [currentPage, roleFilter, fetchUsers]);

  const filtered = users.filter((u) =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase()),
  );

  async function toggleStatus(user: User) {
    await api.patch(`/admin/users/${user.id}/status`, { isActive: !user.isActive });
    fetchUsers(currentPage, roleFilter);
  }

  return (
    <Flex direction="column" gap="5">
      <Box>
        <Heading size="7">Users</Heading>
        <Text color="gray" size="2">{meta.total} total users</Text>
      </Box>

      <Flex gap="3">
        <TextField.Root
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1 }}
        />
        <Select.Root
          value={roleFilter}
          onValueChange={(val) => {
            setRoleFilter(val);
            setCurrentPage(1);
          }}
        >
          <Select.Trigger />
          <Select.Content>
            <Select.Item value="all">All roles</Select.Item>
            <Select.Item value="ADMIN">Admin</Select.Item>
            <Select.Item value="USER">User</Select.Item>
          </Select.Content>
        </Select.Root>
      </Flex>

      <Table.Root variant="surface">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>User</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Role</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Last login</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Actions</Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {loading ? (
            <Table.Row>
              <Table.Cell colSpan={5}>
                <Text color="gray">Loading...</Text>
              </Table.Cell>
            </Table.Row>
          ) : filtered.length === 0 ? (
            <Table.Row>
              <Table.Cell colSpan={5}>
                <Text color="gray">No users found</Text>
              </Table.Cell>
            </Table.Row>
          ) : filtered.map((user) => (
            <Table.Row key={user.id}>
              <Table.Cell>
                <Flex direction="column">
                  <Text size="2" weight="medium">
                    {user.firstName || user.lastName
                      ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
                      : '—'}
                  </Text>
                  <Text size="1" color="gray">{user.email}</Text>
                </Flex>
              </Table.Cell>
              <Table.Cell>
                {user.roles.map((r) => (
                  <Badge key={r} color={r === 'ADMIN' ? 'blue' : 'gray'}>
                    {r}
                  </Badge>
                ))}
              </Table.Cell>
              <Table.Cell>
                <Badge color={user.isActive ? 'green' : 'red'}>
                  {user.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </Table.Cell>
              <Table.Cell>
                <Text size="1" color="gray">
                  {user.lastLoginAt
                    ? new Date(user.lastLoginAt).toLocaleDateString()
                    : 'Never'}
                </Text>
              </Table.Cell>
              <Table.Cell>
                <Flex gap="2">
                  <Button
                    size="1"
                    variant="outline"
                    onClick={() => router.push(`/admin/users/${user.id}`)}
                  >
                    View
                  </Button>
                  <Button
                    size="1"
                    variant="soft"
                    color={user.isActive ? 'red' : 'green'}
                    onClick={() => toggleStatus(user)}
                  >
                    {user.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                </Flex>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>

      {meta.totalPages > 1 && (
        <Flex gap="2" justify="center">
          <Button
            variant="soft"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            Previous
          </Button>
          <Text size="2" style={{ lineHeight: '32px' }}>
            Page {currentPage} of {meta.totalPages}
          </Text>
          <Button
            variant="soft"
            disabled={currentPage === meta.totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            Next
          </Button>
        </Flex>
      )}
    </Flex>
  );
}
// already handled via router in the table
