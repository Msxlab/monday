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
import type { UserRole } from '@/lib/auth-store';

export type SidebarRole = 'admin' | 'designer' | 'production';

export type SidebarItem = {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  roles?: UserRole[];
  featureFlag?: string;
};

const isFeatureEnabled = (featureFlag?: string): boolean => {
  if (!featureFlag) return true;
  return process.env.NEXT_PUBLIC_ENABLED_MODULES?.split(',').includes(featureFlag) ?? false;
};

export const sidebarMenu: SidebarItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Projeler', href: '/projects', icon: FolderKanban, roles: ['super_admin', 'admin'] },
  { label: 'Kullanıcılar', href: '/users', icon: Users, roles: ['super_admin', 'admin'] },
  { label: 'Şirketler', href: '/companies', icon: Building2, roles: ['super_admin', 'admin'] },
  { label: 'İzinler', href: '/leaves', icon: ClipboardCheck },
  { label: 'Analitik', href: '/analytics', icon: BarChart3, roles: ['super_admin', 'admin'] },
  { label: 'Üretim', href: '/production', icon: Wrench },
  { label: 'Finans', href: '/finance', icon: Wallet, roles: ['super_admin', 'admin'] },
  { label: 'Etiketler', href: '/tags', icon: Tags, roles: ['super_admin', 'admin'] },
  { label: 'Yetkiler', href: '/permissions', icon: Shield, roles: ['super_admin', 'admin'] },
  { label: 'Denetim', href: '/audit', icon: ScrollText, roles: ['super_admin', 'admin'] },
  { label: 'Bildirimler', href: '/notifications', icon: Bell },
  { label: 'Günlük Kayıt', href: '/daily-logs', icon: TrendingUp },
  { label: 'AI Asistan', href: '/ai-chat', icon: Bot, featureFlag: 'ai-chat' },
  { label: 'Ayarlar', href: '/settings', icon: Settings, roles: ['super_admin', 'admin'] },
];

export const getVisibleSidebarMenu = (role?: UserRole) =>
  sidebarMenu.filter((item) => {
    const allowedByRole = !item.roles || (role ? item.roles.includes(role) : false);
    return allowedByRole && isFeatureEnabled(item.featureFlag);
  });
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
