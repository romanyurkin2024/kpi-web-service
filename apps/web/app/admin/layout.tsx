'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Box, Flex, Text, Button, Avatar } from '@radix-ui/themes';
import { getMe, logout, CurrentUser } from '@/lib/auth/auth';
import { ThemeToggle } from '@/components/theme-toggle';

const navItems = [
  { label: 'Dashboard', href: '/admin/dashboard' },
  { label: 'Users', href: '/admin/users' },
  { label: 'Integrations', href: '/admin/integrations' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
      document.documentElement.classList.add('dark');
    }
    getMe()
      .then((u) => {
        if (!u.roles.includes('ADMIN')) {
          router.push('/app/dashboard');
        } else {
          setUser(u);
        }
      })
      .catch(() => router.push('/login'));
  }, [router]);

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  if (!user) return null;

  return (
    <Flex style={{ minHeight: '100vh' }}>
      <Box
        style={{
          width: 240,
          background: 'var(--gray-2)',
          borderRight: '1px solid var(--gray-4)',
          padding: '24px 0',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box px="4" mb="6">
          <Flex justify="between" align="center">
            <Box>
              <Text size="5" weight="bold">KPI Platform</Text>
              <Text size="1" color="gray" as="p">Admin Panel</Text>
            </Box>
            <ThemeToggle />
          </Flex>
        </Box>

        <Flex direction="column" gap="1" px="2" style={{ flex: 1 }}>
          {navItems.map((item) => (
            <Box
              key={item.href}
              px="3"
              py="2"
              style={{
                borderRadius: 6,
                cursor: 'pointer',
                background: pathname === item.href ? 'var(--accent-3)' : 'transparent',
                transition: 'background 0.15s',
              }}
              onClick={() => router.push(item.href)}
            >
              <Text
                size="2"
                weight={pathname === item.href ? 'medium' : 'regular'}
                color={pathname === item.href ? 'blue' : undefined}
              >
                {item.label}
              </Text>
            </Box>
          ))}
        </Flex>

        <Box px="4" pt="4" style={{ borderTop: '1px solid var(--gray-4)' }}>
          <Flex align="center" gap="2" mb="3">
            <Avatar
              size="2"
              fallback={user.email[0].toUpperCase()}
              radius="full"
            />
            <Box>
              <Text size="1" weight="medium" as="p">{user.email}</Text>
              <Text size="1" color="gray">Admin</Text>
            </Box>
          </Flex>
          <Button
            variant="soft"
            color="gray"
            size="1"
            onClick={handleLogout}
            style={{ width: '100%' }}
          >
            Sign out
          </Button>
        </Box>
      </Box>

      <Box style={{ flex: 1, padding: 32, overflow: 'auto' }}>
        {children}
      </Box>
    </Flex>
  );
}
