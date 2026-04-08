'use client';

import { useEffect, useState } from 'react';
import {
  Heading, Text, Card, Flex, Box,
  TextField, Button,
} from '@radix-ui/themes';
import { getMe, CurrentUser } from '@/lib/auth/auth';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function UserProfile() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    getMe().then((u) => {
      setUser(u);
      setFirstName(u.firstName ?? '');
      setLastName(u.lastName ?? '');
    });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    try {
      await api.patch('/users/me', { firstName, lastName });
      setSuccess(true);
      toast.success('Profile updated successfully');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  return (
    <Flex direction="column" gap="6">
      <Box>
        <Heading size="7">Profile</Heading>
        <Text color="gray" size="2">Manage your personal information</Text>
      </Box>

      <Card style={{ maxWidth: 480 }}>
        <form onSubmit={handleSave}>
          <Flex direction="column" gap="4">
            <Box>
              <Text size="2" weight="medium" as="p" mb="1">Email</Text>
              <Text size="2" color="gray">{user.email}</Text>
            </Box>

            <Box>
              <Text size="2" weight="medium" as="label">First name</Text>
              <TextField.Root
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                mt="1"
              />
            </Box>

            <Box>
              <Text size="2" weight="medium" as="label">Last name</Text>
              <TextField.Root
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                mt="1"
              />
            </Box>

            {success && (
              <Text color="green" size="2">Profile updated successfully</Text>
            )}

            <Button type="submit" loading={saving}>
              Save changes
            </Button>
          </Flex>
        </form>
      </Card>
    </Flex>
  );
}
