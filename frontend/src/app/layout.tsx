import type { Metadata } from 'next';
import { AppShell } from '@/components/layout/app-shell';
import { ThemeProvider } from '@/components/providers/theme-provider';
import QueryProvider from '@/components/shared/QueryProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Designer Project Tracker',
  description: 'Next.js 14 admin frontend',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <QueryProvider>
            <AppShell>{children}</AppShell>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
