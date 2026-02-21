'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

const ROUTE_LABELS: Record<string, string> = {
  admin: 'Dashboard',
  designer: 'Dashboard',
  production: 'Dashboard',
  projects: 'Projeler',
  kanban: 'Kanban',
  calendar: 'Takvim',
  gantt: 'Gantt',
  designers: 'Tasarımcılar',
  analytics: 'Analitik',
  leaves: 'İzinler',
  users: 'Kullanıcılar',
  settings: 'Ayarlar',
  permissions: 'Permission Matrix',
  'user-permissions': 'Kişisel Yetki',
  notifications: 'Bildirimler',
  'audit-log': 'Audit Log',
  'role-upgrades': 'Rol Yükseltme',
  profile: 'Profil',
  'daily-logs': 'Günlük Loglar',
  performance: 'Performansım',
  leave: 'İzin Talebi',
  'role-upgrade': 'Rol Yükseltme',
  orders: 'Siparişler',
  new: 'Yeni',
  edit: 'Düzenle',
  monday: 'Monday',
  schedule: 'Takvim',
  security: 'Güvenlik',
};

export default function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length <= 1) return null;

  const crumbs: { label: string; href: string }[] = [];
  let currentPath = '';

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += `/${segment}`;

    // Skip numeric IDs but keep them in the path
    if (/^\d+$/.test(segment)) {
      crumbs.push({ label: `#${segment}`, href: currentPath });
      continue;
    }

    const label = ROUTE_LABELS[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);

    // First segment (admin/designer/production) → always "Dashboard"
    if (i === 0) {
      crumbs.push({ label, href: currentPath });
    } else {
      crumbs.push({ label, href: currentPath });
    }
  }

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
      <Link
        href={`/${segments[0]}`}
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>
      {crumbs.slice(1).map((crumb, index) => {
        const isLast = index === crumbs.length - 2;
        return (
          <div key={crumb.href} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
            {isLast ? (
              <span className={cn('font-medium text-foreground')}>{crumb.label}</span>
            ) : (
              <Link
                href={crumb.href}
                className="hover:text-foreground transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
