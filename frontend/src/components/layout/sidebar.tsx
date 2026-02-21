'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { sidebarMenu } from '@/config/routes';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-72 border-r border-border/60 bg-gradient-to-b from-slate-50 to-white p-4 dark:from-slate-950 dark:to-slate-900">
      <div className="mb-6 rounded-xl border border-border/60 bg-card/80 p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Designer Tracker</p>
        <p className="mt-1 text-sm font-medium text-foreground">Yönetim Menüsü</p>
      </div>

      <nav className="space-y-1">
        {sidebarMenu.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition-all duration-200',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <item.icon className="h-4 w-4" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
