import type { ComponentType } from 'react';
import {
  BarChart3,
  Bell,
  ClipboardCheck,
  Factory,
  FileText,
  FolderKanban,
  GanttChartSquare,
  LayoutDashboard,
  Settings,
  Shield,
  TrendingUp,
  User,
  Users,
  Wallet,
} from 'lucide-react';

export type SidebarRole = 'admin' | 'designer' | 'production';

export type SidebarItem = {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  exactMatch?: boolean;
};

export const sidebarMenuByRole: Record<SidebarRole, SidebarItem[]> = {
  admin: [
    { label: 'Dashboard', href: '/admin', icon: LayoutDashboard, exactMatch: true },
    { label: 'Projeler', href: '/admin/projects', icon: FolderKanban },
    { label: 'Tasarımcılar', href: '/admin/designers', icon: Users },
    { label: 'Analitik', href: '/admin/analytics', icon: BarChart3 },
    { label: 'Üretim', href: '/admin/production', icon: Factory },
    { label: 'İzinler', href: '/admin/leaves', icon: ClipboardCheck },
    { label: 'Finans', href: '/admin/finance', icon: Wallet },
    { label: 'Kullanıcılar', href: '/admin/users', icon: Shield },
    { label: 'Denetim', href: '/admin/audit-log', icon: FileText },
    { label: 'Rol Yükseltme', href: '/admin/role-upgrades', icon: TrendingUp },
    { label: 'Ayarlar', href: '/admin/settings', icon: Settings },
    { label: 'Bildirimler', href: '/notifications', icon: Bell, exactMatch: true },
    { label: 'Profil', href: '/profile', icon: User, exactMatch: true },
  ],
  designer: [
    { label: 'Dashboard', href: '/designer', icon: LayoutDashboard, exactMatch: true },
    { label: 'Projelerim', href: '/designer/projects', icon: FolderKanban },
    { label: 'Günlük Kayıt', href: '/designer/daily-logs', icon: ClipboardCheck },
    { label: 'Performansım', href: '/designer/performance', icon: BarChart3 },
    { label: 'İzin Talebi', href: '/designer/leave', icon: ClipboardCheck },
    { label: 'Rol Yükseltme', href: '/designer/role-upgrade', icon: TrendingUp },
    { label: 'Bildirimler', href: '/notifications', icon: Bell, exactMatch: true },
    { label: 'Profil', href: '/profile', icon: User, exactMatch: true },
  ],
  production: [
    { label: 'Dashboard', href: '/production', icon: LayoutDashboard, exactMatch: true },
    { label: 'Siparişler', href: '/production/orders', icon: GanttChartSquare },
    { label: 'Bildirimler', href: '/notifications', icon: Bell, exactMatch: true },
    { label: 'Profil', href: '/profile', icon: User, exactMatch: true },
  ],
};

// Legacy export kept for components that still render a single, static menu.
export const sidebarMenu: SidebarItem[] = sidebarMenuByRole.admin;
