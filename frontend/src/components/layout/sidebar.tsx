'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { sidebarMenu } from '@/config/routes';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r bg-muted/30 p-4">
      <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Menu</p>
      <nav className="space-y-1">
        {sidebarMenu.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
              )}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
