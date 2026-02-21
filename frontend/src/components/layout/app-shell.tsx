'use client';

import { usePathname } from 'next/navigation';
import { AuthGuard } from '@/components/layout/auth-guard';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/';

  if (isLoginPage) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <AuthGuard>
      {children}
    </AuthGuard>
  );
}
