'use client';

import AuthGuard from '@/components/shared/AuthGuard';
import Sidebar from '@/components/shared/Sidebar';
import Topbar from '@/components/shared/Topbar';
import Breadcrumb from '@/components/shared/Breadcrumb';

export default function ProductionLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={['production']}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto bg-background p-4 lg:p-6">
            <Breadcrumb />
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
