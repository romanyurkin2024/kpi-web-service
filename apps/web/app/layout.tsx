import type { Metadata } from 'next';
import { Theme } from '@radix-ui/themes';
import { Providers } from '@/components/providers/query-provider';
import { Toaster } from 'sonner';
import '@radix-ui/themes/styles.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'KPI Platform',
  description: 'KPI Management Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Theme
          accentColor="blue"
          radius="medium"
          scaling="95%"
          appearance="inherit"
        >
          <Providers>
            {children}
          </Providers>
          <Toaster richColors duration={3000} position="top-right" />
        </Theme>
      </body>
    </html>
  );
}
