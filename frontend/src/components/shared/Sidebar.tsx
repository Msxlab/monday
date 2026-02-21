'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth-store';
import { useSidebarStore } from '@/lib/sidebar-store';
import api from '@/lib/api';
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  BarChart3,
  Settings,
  Factory,
  CalendarDays,
  Shield,
  Bell,
  LogOut,
  Layers,
  User,
  FileText,
  Columns3,
  Calendar,
  TrendingUp,
  ClipboardList,
  GanttChartSquare,
  DollarSign,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  exactMatch?: boolean;
}

const roleLabel: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  senior_designer: 'Kıdemli Tasarımcı',
  designer: 'Tasarımcı',
  production: 'Üretim',
};

const roleColor: Record<string, string> = {
  super_admin: 'bg-purple-500/20 text-purple-600 dark:text-purple-400',
  admin: 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400',
  senior_designer: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
  designer: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
  production: 'bg-orange-500/20 text-orange-600 dark:text-orange-400',
};

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const { data: unreadCount } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: async () => {
      const { data } = await api.get('/notifications/unread-count');
      return data.data?.count ?? 0;
    },
    refetchInterval: 30000,
    enabled: !!user,
  });

  if (!user) return null;

  const isAdmin = user.role === 'super_admin' || user.role === 'admin';
  const isDesigner = user.role === 'designer' || user.role === 'senior_designer';
  const isProduction = user.role === 'production';

  const adminNav: NavItem[] = [
    { href: '/admin', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" />, exactMatch: true },
    { href: '/admin/projects', label: 'Projeler', icon: <FolderKanban className="h-4 w-4" /> },
    { href: '/admin/projects/kanban', label: 'Kanban', icon: <Columns3 className="h-4 w-4" /> },
    { href: '/admin/projects/calendar', label: 'Takvim', icon: <Calendar className="h-4 w-4" /> },
    { href: '/admin/projects/gantt', label: 'Gantt', icon: <GanttChartSquare className="h-4 w-4" /> },
    { href: '/admin/designers', label: 'Tasarımcılar', icon: <Users className="h-4 w-4" /> },
    { href: '/admin/analytics', label: 'Analitik', icon: <BarChart3 className="h-4 w-4" /> },
    { href: '/admin/production', label: 'Üretim', icon: <Factory className="h-4 w-4" /> },
    { href: '/admin/leaves', label: 'İzinler', icon: <CalendarDays className="h-4 w-4" /> },
    { href: '/admin/finance', label: 'Finans', icon: <DollarSign className="h-4 w-4" /> },
    { href: '/admin/users', label: 'Kullanıcılar', icon: <Shield className="h-4 w-4" /> },
    { href: '/admin/audit-log', label: 'Audit Log', icon: <FileText className="h-4 w-4" /> },
    { href: '/admin/role-upgrades', label: 'Rol Yükseltme', icon: <TrendingUp className="h-4 w-4" /> },
    { href: '/admin/settings', label: 'Ayarlar', icon: <Settings className="h-4 w-4" /> },
  ];

  const designerNav: NavItem[] = [
    { href: '/designer', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" />, exactMatch: true },
    { href: '/designer/projects', label: 'Projelerim', icon: <FolderKanban className="h-4 w-4" /> },
    { href: '/designer/daily-logs', label: 'Günlük Loglar', icon: <ClipboardList className="h-4 w-4" /> },
    { href: '/designer/performance', label: 'Performansım', icon: <BarChart3 className="h-4 w-4" /> },
    { href: '/designer/leave', label: 'İzin Talebi', icon: <CalendarDays className="h-4 w-4" /> },
    { href: '/designer/role-upgrade', label: 'Rol Yükseltme', icon: <TrendingUp className="h-4 w-4" /> },
  ];

  const productionNav: NavItem[] = [
    { href: '/production', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" />, exactMatch: true },
    { href: '/production/orders', label: 'Siparişler', icon: <Factory className="h-4 w-4" /> },
  ];

  let navItems: NavItem[] = [];
  if (isAdmin) navItems = adminNav;
  else if (isDesigner) navItems = designerNav;
  else if (isProduction) navItems = productionNav;

  const initials = `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-5 shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Layers className="h-4 w-4 text-primary-foreground" />
        </div>
        <div>
          <span className="text-sm font-bold leading-none">Designer</span>
          <span className="block text-xs text-muted-foreground leading-none mt-0.5">Tracker</span>
        </div>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-3 py-4 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = item.exactMatch
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-primary/15 text-primary shadow-sm'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              <span className={cn('flex-shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')}>
                {item.icon}
              </span>
              {item.label}
              {isActive && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>

      <Separator />

      {/* Bottom links */}
      <div className="px-3 py-2 space-y-0.5 shrink-0">
        <Link
          href="/notifications"
          onClick={onNavigate}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
            pathname === '/notifications'
              ? 'bg-primary/15 text-primary'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
          )}
        >
          <Bell className="h-4 w-4 flex-shrink-0" />
          Bildirimler
          {unreadCount > 0 && (
            <Badge className="ml-auto h-5 min-w-5 rounded-full bg-primary px-1 text-[10px] text-primary-foreground">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Link>
        <Link
          href="/profile"
          onClick={onNavigate}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
            pathname === '/profile'
              ? 'bg-primary/15 text-primary'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
          )}
        >
          <User className="h-4 w-4 flex-shrink-0" />
          Profilim
        </Link>
      </div>

      <Separator />

      {/* User */}
      <div className="flex items-center gap-3 px-4 py-3 shrink-0">
        <Avatar className="h-9 w-9 ring-2 ring-primary/20">
          {user.avatar_url && (
            <AvatarImage
              src={user.avatar_url.startsWith('http') ? user.avatar_url : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${user.avatar_url}`}
              alt={user.first_name}
            />
          )}
          <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{user.first_name} {user.last_name}</p>
          <span className={cn('inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium', roleColor[user.role] || 'bg-muted text-muted-foreground')}>
            {roleLabel[user.role] || user.role}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={logout}
          title="Çıkış"
          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function MobileSidebar() {
  const { isOpen, close } = useSidebarStore();

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) close(); }}>
      <SheetContent side="left" className="w-64 p-0">
        <SheetTitle className="sr-only">Navigasyon Menüsü</SheetTitle>
        <SidebarContent onNavigate={close} />
      </SheetContent>
    </Sheet>
  );
}

export default function Sidebar() {
  return (
    <aside className="hidden lg:flex h-screen w-64 flex-col border-r bg-card shrink-0">
      <SidebarContent />
    </aside>
  );
}
