'use client';

import { useQuery } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import { Bell, Sun, Moon, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GlobalSearch from '@/components/shared/GlobalSearch';
import { MobileSidebar } from '@/components/shared/Sidebar';
import { useSidebarStore } from '@/lib/sidebar-store';
import Link from 'next/link';
import api from '@/lib/api';

export default function Topbar() {
  const { theme, setTheme } = useTheme();
  const openSidebar = useSidebarStore((s) => s.open);

  const { data: unreadCount } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: async () => {
      const { data } = await api.get('/notifications/unread-count');
      return data.data?.count ?? 0;
    },
    refetchInterval: 30_000,
  });

  return (
    <>
      <MobileSidebar />
      <header className="flex h-16 items-center justify-between border-b bg-card px-4 lg:px-6">
        {/* Mobile menu + Search */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={openSidebar}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Menü</span>
          </Button>
          <GlobalSearch />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Tema degistir</span>
          </Button>
          <Link href="/notifications">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {(unreadCount ?? 0) > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </Link>
        </div>
      </header>
    </>
  );
}
