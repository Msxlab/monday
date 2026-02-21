import type { ComponentType } from 'react';
import { FolderKanban, LayoutDashboard, Settings, Shield, Users } from 'lucide-react';

export const appRoutes = ['/admin', '/projects', '/users', '/settings'] as const;

export type AppRoute = (typeof appRoutes)[number];

export type SidebarItem = {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
};

const sidebarItems: SidebarItem[] = [
  { label: 'Admin Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Projects', href: '/projects', icon: FolderKanban },
  { label: 'Users', href: '/users', icon: Users },
  { label: 'Settings', href: '/settings', icon: Settings },
  { label: 'Role Security', href: '/roles', icon: Shield },
  { label: 'Legacy Empty', href: '', icon: Shield },
];

export const sidebarMenu = sidebarItems.filter((item) => {
  if (!item.href) return false;
  return appRoutes.includes(item.href as AppRoute);
});
