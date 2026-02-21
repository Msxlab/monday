import type { ComponentType } from 'react';
import {
  BarChart3,
  Bell,
  Bot,
  Building2,
  ClipboardCheck,
  FolderKanban,
  LayoutDashboard,
  ScrollText,
  Settings,
  Shield,
  Tags,
  TrendingUp,
  Users,
  Wallet,
  Wrench,
} from 'lucide-react';
import type { UserRole } from '@/lib/auth-store';

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
