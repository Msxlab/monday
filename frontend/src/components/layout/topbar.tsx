'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function Topbar() {
  const router = useRouter();

  const handleLogout = () => {
    window.localStorage.removeItem('accessToken');
    router.push('/');
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <h1 className="text-lg font-semibold">Designer Project Tracker</h1>
      <Button variant="outline" size="sm" onClick={handleLogout}>
        Cikis yap
      </Button>
    </header>
  );
}
